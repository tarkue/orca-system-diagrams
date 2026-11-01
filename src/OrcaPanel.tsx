import { useEffect, useState } from 'react';
import { PanelRight, X } from 'lucide-react';
import { diagramFor, type Notation, type SystemModel } from './core';
import { Diagram } from './Diagram';
import { elementsForNotation, readInjectedModel } from './viewer/model';
import { readWorkspaceContext } from '../orca-plugin/src/bridge';

const notations: {id: Notation; name: string}[] = [
  {id:'c4',name:'C4'}, {id:'bpmn',name:'BPMN'}, {id:'epc',name:'EPC'},
  {id:'sequence',name:'Sequence'}, {id:'er',name:'ER'}, {id:'state',name:'State'},
];
export function OrcaPanel() {
  const [model] = useState(() => readInjectedModel(window.__SYSTEM_DIAGRAM_MODEL__));
  const [notation, setNotation] = useState<Notation>('c4');
  const [inspector, setInspector] = useState(false);
  const [selected, setSelected] = useState('');
  const [focusRequest, setFocusRequest] = useState<{id:string;revision:number}>();
  const [view, setView] = useState<'diagram'|'json'>('diagram');
  const [context, setContext] = useState('Получаем контекст Orca…');
  useEffect(() => {
    let live = true;
    readWorkspaceContext().then(value => {
      if(live) setContext(value ? [value.displayName, value.branch].filter(Boolean).join(' / ') : 'Рабочее пространство не выбрано');
    }).catch(() => { if(live) setContext('Контекст Orca недоступен'); });
    return () => {live = false;};
  }, []);
  return <div className="orca-panel">
    <header className="viewer-header">
      <strong>Схемы системы</strong>
      <span className="viewer-context" title={context}>{context}</span>
    </header>
    {model ? <>
      <div className="viewer-toolbar">
        <div className="viewer-tabs" role="group" aria-label="Вид модели">
          <button aria-pressed={view === 'diagram'} onClick={() => setView('diagram')}>Схема</button>
          <button aria-pressed={view === 'json'} onClick={() => setView('json')}>JSON</button>
        </div>
        {view === 'diagram' && <select aria-label="Нотация" value={notation} onChange={event => {setNotation(event.target.value as Notation);setSelected('');setFocusRequest(undefined);}}>
          {notations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>}
        <span className="viewer-model-meta">{model.name} · v{model.version}</span>
        <button className="viewer-inspector-toggle" aria-label={inspector ? 'Скрыть инспектор' : 'Показать инспектор'} title={inspector ? 'Скрыть инспектор' : 'Показать инспектор'} aria-pressed={inspector} onClick={() => setInspector(value => !value)}><PanelRight size={18} aria-hidden="true" /></button>
      </div>
      <div className="viewer-workspace">
      {view === 'diagram' ? <Diagram key={model.id + notation} model={model} notation={notation} source={diagramFor(model, notation)} selected={selected} focusRequest={focusRequest} onSelect={id => {setSelected(id);setInspector(true);}} /> :
        <pre className="viewer-json" tabIndex={0} aria-label="Модель JSON, только чтение">{JSON.stringify(model, null, 2)}</pre>}
      {inspector && <ModelInspector notation={notation} model={model} selected={selected} onSelect={id => {setSelected(id);setView('diagram');setFocusRequest(previous => ({id,revision:(previous?.revision ?? 0)+1}));}} onClose={() => setInspector(false)} />}
      </div>
    </> : <div className="viewer-empty"><h2>Модель не подключена</h2></div>}
  </div>;
}

function ModelInspector({model, notation, selected, onSelect, onClose}: {model:SystemModel;notation:Notation;selected:string;onSelect:(id:string)=>void;onClose:()=>void}) {
  const elements = elementsForNotation(model, notation);
  const element = elements.find(item => item.id === selected);
  return <aside className="viewer-inspector" aria-label="Инспектор модели">
    <div className="viewer-inspector-heading"><strong>Инспектор</strong><button aria-label="Закрыть инспектор" onClick={onClose}><X size={16} aria-hidden="true" /></button></div>
    <nav className="viewer-element-list" aria-label="Элементы модели">{elements.map(item => <button key={item.id} aria-pressed={item.id === element?.id} onClick={() => onSelect(item.id)}>{item.name}</button>)}{!elements.length && <p>В этой нотации нет элементов.</p>}</nav>
    <section className="viewer-element-detail" aria-label="Сведения об элементе">
    <h3>{element?.name ?? model.name}</h3>
    <p>{element && 'description' in element ? String(element.description) : model.description}</p>
    {element && <dl>{Object.entries(element).filter(([key]) => key !== 'name' && key !== 'description').map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'string' ? value : JSON.stringify(value,null,2)}</dd></div>)}</dl>}
    </section>
  </aside>;
}
