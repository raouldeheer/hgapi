import ReactDOM from 'react-dom/client';
import { WarmapEventHandler } from './warmapEventHandler';
import Warmap from './map/warmap';

const warmapEventHandler = new WarmapEventHandler();
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Warmap warmapEventHandler={warmapEventHandler} />);
} else console.error("root element not found!");
