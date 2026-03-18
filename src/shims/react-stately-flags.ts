let tableNestedRowsEnabled = false
let shadowDOMEnabled = false

export function enableTableNestedRows(): void {
  tableNestedRowsEnabled = true
}

export function tableNestedRows(): boolean {
  return tableNestedRowsEnabled
}

export function enableShadowDOM(): void {
  shadowDOMEnabled = true
}

export function shadowDOM(): boolean {
  return shadowDOMEnabled
}
