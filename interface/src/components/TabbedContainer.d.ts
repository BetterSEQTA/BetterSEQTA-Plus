import React, { JSX } from 'react';
interface Tab {
    title: string;
    content: JSX.Element;
}
interface TabbedContainerProps {
    tabs: Tab[];
    themeColor: string;
}
declare const TabbedContainer: React.FC<TabbedContainerProps>;
export default TabbedContainer;
