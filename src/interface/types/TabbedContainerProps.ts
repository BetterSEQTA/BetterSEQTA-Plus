import React, { JSX } from 'react';
export interface Tab {
    title: string;
    content: JSX.Element;
}
export interface TabbedContainerProps {
    tabs: Tab[];
    animations?: boolean;
}
declare const TabbedContainer: React.FC<TabbedContainerProps>;
export default TabbedContainer;
