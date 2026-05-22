/// <reference types="vite/client" />

declare module "leaflet-routing-machine";
declare module "*.png" {
  const src: string;
  export default src;
}
