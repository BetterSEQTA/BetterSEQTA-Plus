import ReactDOM from 'react-dom/client';
import root from 'react-shadow';
import styles from './otherFunction.css?inline';

// Define your React component
export default function MyComponent() {

  return (
    <root.div>
      <div className="bg-black/40 backdrop-blur-xl">hi there</div>
      <style type="text/css">{styles}</style>
    </root.div>
  );
};

// Function to render the React component within Shadow DOM
export const renderInShadowDom = (selector: string) => {
  // Find the host element
  const hostElement = document.querySelector(selector);
  if (!hostElement) {
    console.error('Host element not found');
    return;
  }

  const element = document.createElement('div');
  hostElement.appendChild(element);

  const root = ReactDOM.createRoot(element);

  root.render(<MyComponent />);
};
const hostElement = document.querySelector('nothing')!;

if (hostElement) {
  const element = document.createElement('div');
  hostElement.appendChild(element);
  
  const root1 = ReactDOM.createRoot(element);
  
  root1.render(<MyComponent />);
}