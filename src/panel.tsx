import React, { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { OrcaPanel } from './OrcaPanel';
import './panel.css';

class ViewerBoundary extends Component<{children: ReactNode}, {error: string}> {
  state = {error: ''};
  static getDerivedStateFromError(error: Error) { return {error:error.message}; }
  render() {
    if(this.state.error) return <div className="orca-panel"><div className="viewer-empty" role="alert"><h2>Не удалось открыть схему</h2><p>{this.state.error}</p><button onClick={() => location.reload()}>Перезагрузить</button></div></div>;
    return this.props.children;
  }
}
const root = document.getElementById('root') || document.body.appendChild(Object.assign(document.createElement('div'), {id:'root'}));
createRoot(root).render(<ViewerBoundary><OrcaPanel /></ViewerBoundary>);
