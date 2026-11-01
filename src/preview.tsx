// Development preview only. The distributed plugin receives these values from Orca.
import model from '../orca-plugin/model.json';
window.__SYSTEM_DIAGRAM_MODEL__ = model;
document.documentElement.classList.add('dark');
const tokens = {background:'#0a0a0a',foreground:'#fafafa',card:'#171717',primary:'#e5e5e5',muted:'#262626','muted-foreground':'#a1a1a1',accent:'#404040',border:'#ffffff12'};
for (const [name,value] of Object.entries(tokens)) document.documentElement.style.setProperty('--'+name,value);
void import('./panel');
