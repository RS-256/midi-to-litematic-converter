import "@fontsource-variable/m-plus-2"
import "@fontsource/m-plus-rounded-1c/700.css"
import "@fontsource/m-plus-rounded-1c/800.css"
import "./styles/global.css"
import { App } from "./App"
import { getElement } from "./utils/dom"

new App( getElement< HTMLDivElement >( "#app" ) )
