import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { Notation, SystemModel } from './core';
import { renderNotation } from './notations/render';
import { clampZoom, fitZoom, initialZoom, scaledSize, zoomScroll, stepZoom, wheelZoom, doubleClickZoom, ZOOM_STOPS, type Size } from './viewer/viewport';
import { focusElement } from './viewer/navigation';

let renderCount = 0;
function themeColors(element: HTMLElement) {
  const probe = document.createElement('span');
  element.append(probe);
  const color = (token: string, fallback: string) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    probe.style.color = raw ? (CSS.supports('color', raw) ? raw : `hsl(${raw})`) : fallback;
    return getComputedStyle(probe).color;
  };
  const colors = {background:color('--background','#202020'), primaryColor:color('--card','#303030'), primaryTextColor:color('--foreground','#eeeeee'), primaryBorderColor:color('--border','#666666'), lineColor:color('--muted-foreground','#aaaaaa'), secondaryColor:color('--muted','#383838'), tertiaryColor:color('--accent','#444444')};
  probe.remove();
  return colors;
}
export function Diagram({source, model, notation, zoom: controlledZoom, onSelect, onFitChange, selected, focusRequest}: {
  source: string; model?: SystemModel; notation?: Notation; zoom?: number; onSelect?: (id: string) => void; onFitChange?: (scale: number) => void;
  selected?: string; focusRequest?: {id:string;revision:number};
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const drawing = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g,'');
  const [size, setSize] = useState<Size>({width: 0,height: 0});
  const [localZoom, setZoom] = useState(1);
  const zoom = controlledZoom ?? localZoom;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(0);
  const fitted = useRef(false);
  const elementIds = useRef<Record<string,string>>({});
  const pendingScroll = useRef<{left:number;top:number}|null>(null);
  const callbacks = useRef({onFitChange});
  callbacks.current = {onFitChange};
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(value => value + 1));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']});
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let live = true;
    setError('');
    if(!drawing.current) return;
    if(!model || !notation) mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base', themeVariables:{...themeColors(drawing.current),fontFamily:getComputedStyle(drawing.current).fontFamily,fontSize:'14px'},flowchart:{padding:24},sequence:{mirrorActors:false}});
    const id = 'diagram'+uid+ ++renderCount;
    const tokens = Object.fromEntries(['--background','--foreground','--card','--muted','--muted-foreground','--border','--primary','--accent'].map(token => [token,getComputedStyle(document.documentElement).getPropertyValue(token).trim()]));
    const rendering = model && notation ? renderNotation(model,notation,id,tokens) : mermaid.render(id,source).then(result => ({svg:result.svg,width:0,height:0,elementIdMap:{}}));
    rendering.then(({svg,width,height,elementIdMap}) => {
      if(!live || !drawing.current) return;
      drawing.current.innerHTML = svg;
      elementIds.current = elementIdMap ?? {};
      const svgElement = drawing.current.querySelector('svg');
      if(!svgElement) return;
      const box = svgElement.viewBox.baseVal;
      setSize({width:width || box.width || 800,height:height || box.height || 400});
      svgElement.style.maxWidth = 'none';
      svgElement.style.minWidth = '0';
      svgElement.style.minHeight = '0';
      svgElement.setAttribute('role','img');
      svgElement.setAttribute('aria-label','Диаграмма текущей модели');
    }).catch(cause => {if(live) setError(String(cause));});
    return () => {live=false;};
  },[source,uid,theme,model,notation]);
  useLayoutEffect(() => {
    const svg = drawing.current?.querySelector('svg');
    const scaled = scaledSize(size,zoom);
    if(svg) {svg.style.width=scaled.width+'px';svg.style.height=scaled.height+'px';}
    if(pendingScroll.current && viewport.current) {
      viewport.current.scrollLeft=pendingScroll.current.left;
      viewport.current.scrollTop=pendingScroll.current.top;
      pendingScroll.current=null;
    }
  },[size,zoom]);
  useLayoutEffect(() => {
    const elements = drawing.current?.querySelectorAll('[id], [data-model-id]');
    elements?.forEach(element => {
      const modelId = elementIds.current[element.id] || element.getAttribute('data-model-id');
      if(modelId && modelId === selected) element.setAttribute('data-selected', 'true');
      else element.removeAttribute('data-selected');
    });
  },[selected,size]);
  useLayoutEffect(() => {
    const container = viewport.current;
    const canvas = drawing.current;
    if(!container || !canvas || !focusRequest || !size.width) return;
    // Compare attribute values directly: model IDs need not be CSS-safe identifiers.
    const target = Array.from(canvas.querySelectorAll('[id], [data-model-id]')).find(element =>
      (elementIds.current[element.id] || element.getAttribute('data-model-id')) === focusRequest.id);
    if(!target) return;
    const bounds = target.getBoundingClientRect();
    const origin = canvas.getBoundingClientRect();
    const current = zoomRef.current;
    const next = focusElement({width:container.clientWidth,height:container.clientHeight},size,
      {x:(bounds.left-origin.left)/current,y:(bounds.top-origin.top)/current,width:bounds.width/current,height:bounds.height/current},current);
    fitted.current = true;
    if(next.zoom !== current && controlledZoom === undefined) {
      pendingScroll.current = next;
      zoomRef.current = next.zoom;
      setZoom(next.zoom);
      callbacks.current.onFitChange?.(next.zoom);
    } else container.scrollTo(next.left,next.top);
  },[focusRequest,size,controlledZoom]);
  useEffect(() => {
    if(!viewport.current || !size.width || fitted.current) return;
    fitted.current=true;
    const scale=initialZoom({width:viewport.current.clientWidth,height:viewport.current.clientHeight},size);
    zoomRef.current=scale;
    setZoom(scale);
    callbacks.current.onFitChange?.(scale);
  },[size]);
  function changeZoom(next: number, x?:number,y?:number) {
    const element=viewport.current;
    if(!element) return;
    const scale=clampZoom(next);
    if(scale === zoomRef.current) return;
    pendingScroll.current={left:zoomScroll(pendingScroll.current?.left ?? element.scrollLeft,x ?? element.clientWidth/2,zoomRef.current,scale),top:zoomScroll(pendingScroll.current?.top ?? element.scrollTop,y ?? element.clientHeight/2,zoomRef.current,scale)};
    zoomRef.current=scale;
    setZoom(scale);
    callbacks.current.onFitChange?.(scale);
  }
  useEffect(() => {
    const element=viewport.current;
    if(!element) return;
    const wheel=(event:WheelEvent) => {
      if(event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect=element.getBoundingClientRect();
        changeZoom(wheelZoom(zoomRef.current,event.deltaY,event.deltaMode,element.clientHeight),event.clientX-rect.left,event.clientY-rect.top);
      } else if(event.shiftKey && !event.deltaX) {event.preventDefault();element.scrollLeft+=event.deltaY;}
    };
    element.addEventListener('wheel',wheel,{passive:false});
    return () => element.removeEventListener('wheel',wheel);
  });
  function fit() {
    if(!viewport.current) return;
    changeZoom(fitZoom({width:viewport.current.clientWidth,height:viewport.current.clientHeight},size),0,0);
    if(pendingScroll.current) pendingScroll.current={left:0,top:0};
    // Fit may keep the same zoom; scroll explicitly in that case too.
    viewport.current.scrollTo(0,0);
  }
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
  return <div className="diagram-container" style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
    {controlledZoom === undefined && <div className="diagram-controls">
      <button aria-label="Уменьшить" onClick={() => changeZoom(stepZoom(zoomRef.current,-1))}>−</button>
      <select aria-label="Масштаб диаграммы" value={zoom} onChange={event => changeZoom(Number(event.target.value))}>
        {!ZOOM_STOPS.some(stop => stop === zoom) && <option value={zoom}>{Math.round(zoom*100)}%</option>}
        {ZOOM_STOPS.map(stop => <option key={stop} value={stop}>{stop*100}%</option>)}
      </select>
      <button aria-label="Увеличить" onClick={() => changeZoom(stepZoom(zoomRef.current,1))}>+</button>
    </div>}
    <div ref={viewport} className="diagram-scroll" tabIndex={0} aria-label="Диаграмма: прокрутка; Ctrl или Cmd и колесо — масштаб; двойной щелчок — увеличить, Shift и двойной щелчок — уменьшить; средняя кнопка — перемещение" style={{overflow:'auto',flex:1,minHeight:0}}
      onKeyDown={event => {
        if(event.key==='+' || event.key==='=') {event.preventDefault();changeZoom(stepZoom(zoomRef.current,1));}
        if(event.key==='-') {event.preventDefault();changeZoom(stepZoom(zoomRef.current,-1));}
        if(event.key==='0') {event.preventDefault();changeZoom(1);}
        if(event.key.toLowerCase()==='f') {event.preventDefault();fit();}
      }}
      onPointerDown={event => {
        if(event.button!==1) return;
        event.preventDefault();
        const element=event.currentTarget;
        drag.current={x:event.clientX,y:event.clientY,left:element.scrollLeft,top:element.scrollTop};
        element.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if(!drag.current) return;
        event.currentTarget.scrollLeft=drag.current.left+drag.current.x-event.clientX;
        event.currentTarget.scrollTop=drag.current.top+drag.current.y-event.clientY;
      }} onPointerUp={() => {drag.current=null;}} onPointerCancel={() => {drag.current=null;}}>
      {error && <div role="alert" className="diagram-error">Не удалось построить диаграмму: {error}</div>}
        <div ref={drawing} className="mermaid-view" style={{...scaledSize(size,zoom),display:error ? 'none' : 'block',transform:'none',padding:0,margin:0}} onDoubleClick={event => {
          if(event.button !== 0 || (event.target as Element).closest('a,button,input,select,textarea,[role="button"]')) return;
          const rect = viewport.current?.getBoundingClientRect();
          if(!rect) return;
          event.preventDefault();
          changeZoom(doubleClickZoom(zoomRef.current,event.shiftKey),event.clientX-rect.left,event.clientY-rect.top);
        }} onClick={event => {
          let element = event.target as Element | null;
          while(element && element !== drawing.current) {
            const mapped = elementIds.current[element.id] || element.getAttribute('data-model-id');
            if(mapped) { onSelect?.(mapped); return; }
            element = element.parentElement;
          }
          const node=(event.target as Element).closest('[data-id],g.node,g.actor,g.stateGroup');
          if(node) onSelect?.(node.getAttribute('data-id') || node.id);
        }}/>
    </div>
  </div>;
}
