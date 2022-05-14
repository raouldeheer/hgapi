import ReactDOM from 'react-dom/client';
import { WarState } from './warmapEventHandler';
import Warmap from './map/warmap';

const warState = new WarState();
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Warmap warState={warState} />);
} else console.error("root element not found!");
