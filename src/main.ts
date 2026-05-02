import { App } from "./App";
import "./style.css";
import { getElement } from "./utils/dom";

new App(getElement<HTMLDivElement>("#app"));
