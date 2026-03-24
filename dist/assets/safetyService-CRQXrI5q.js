import{c as o,a as e}from"./index-D1BVixCN.js";/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=[["path",{d:"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",key:"1slcih"}]],i=o("flame",s);async function l(){const t=await e("/safety/dashboard",{noCache:!0});return(t==null?void 0:t.data)??{context:null,metrics:{},alerts:[],reports:[],watchlist:[]}}async function y(t){const a=await e("/safety/alerts",{method:"POST",body:JSON.stringify(t)});return(a==null?void 0:a.data)??null}async function d(t,a){const n=await e(`/safety/alerts/${encodeURIComponent(t)}/cancel`,{method:"POST",body:JSON.stringify({reason:a})});return(n==null?void 0:n.data)??null}async function f(t,a,n){const c=await e(`/safety/alerts/${encodeURIComponent(t)}/action`,{method:"POST",body:JSON.stringify({action:a,notes:n})});return(c==null?void 0:c.data)??null}async function u(t){const a=await e("/safety/visitor-reports",{method:"POST",body:JSON.stringify(t)});return(a==null?void 0:a.data)??null}export{i as F,f as a,d as c,l as g,u as s,y as t};
