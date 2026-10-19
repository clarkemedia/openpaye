import { render, type VNode } from 'preact';

/** Pages are pre-rendered for search engines; replace that HTML with the live app. */
export function hydrateOrRender(vnode: VNode, el: HTMLElement) {
  el.textContent = '';
  render(vnode, el);
}
