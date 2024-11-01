export interface SettingsList {
  title: string;
  id: number;
  description: string;
  Component: any; /* TODO: Give this a type */
  props?: any;
}