### mge-dashboard



<!-- Auto Generated Below -->


## Properties

| Property           | Attribute           | Description                                                                                                                                                             | Type     | Default       |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| `_annotationChart` | `_annotation-chart` |                                                                                                                                                                         | `any`    | `null`        |
| `_dashboardArea`   | `_dashboard-area`   | Area of dashboard for interacting                                                                                                                                       | `any`    | `undefined`   |
| `_dragConect`      | `_drag-conect`      | Drag connection of views                                                                                                                                                | `any`    | `undefined`   |
| `_historyChart`    | `_history-chart`    | Stores the graph that contains history                                                                                                                                  | `any`    | `null`        |
| `_historydata`     | `_historydata`      |                                                                                                                                                                         | `any`    | `undefined`   |
| `_initView`        | `_init-view`        | First view of the dashboard. It depends on the value of initComponent to define what visualization technique or initial query is the first view to be initialized with. | `any`    | `undefined`   |
| `_treeCharts`      | `_tree-charts`      | Stores the tree of connections between views                                                                                                                            | `any`    | `null`        |
| `datasetName`      | `dataset-name`      | The dataset name being used                                                                                                                                             | `string` | `undefined`   |
| `initComponent`    | `init-component`    | type of visualization which want to create in inital point                                                                                                              | `any`    | `'mge-query'` |
| `x`                | `x`                 | x-coordinate (The horizontal value in a pair of coordinates) of the dashboard                                                                                           | `number` | `0`           |
| `y`                | `y`                 | y-coordinate (The vertical value in a pair of coordinates) of the dashboard                                                                                             | `number` | `0`           |


## Methods

### `_addLink(viewParent: any, viewChild: any) => Promise<{ line: any; conect: any; visible: boolean; }>`

This function is to create links from parent window and the children windown
It includes connection and line links

#### Returns

Type: `Promise<{ line: any; conect: any; visible: boolean; }>`



### `_addLinkAnnotation(viewParents: any, viewChild: any) => Promise<{ lines: any[]; conect: any; visible: boolean; }>`



#### Returns

Type: `Promise<{ lines: any[]; conect: any; visible: boolean; }>`



### `_addcube(viewChild: any) => Promise<{ lines: any[]; conect: any; visible: boolean; }>`



#### Returns

Type: `Promise<{ lines: any[]; conect: any; visible: boolean; }>`



### `addChart(idParent: any, objChart: any) => Promise<void>`

This method adds a new view to the dashboard and update the tree history with information regarding the new view.

#### Returns

Type: `Promise<void>`



### `cache(value: any) => Promise<void>`

This method serve to enable/disable the cache. If enabled, you must provide the corresponding API routes.

#### Returns

Type: `Promise<void>`



### `closeView(view: any) => Promise<void>`

This method hides the given view from the dashboard (CSS - display:none) and update the status of this
view in the history panel (mge-history).

#### Returns

Type: `Promise<void>`



### `disableInitialQueryPanel() => Promise<void>`

This method allosw disable the initial query panel. By default, the dashboard is started with a Query panel.

#### Returns

Type: `Promise<void>`



### `disableView(key: any) => Promise<void>`

This method serve to disable a view. By default all views are enabled.

#### Returns

Type: `Promise<void>`



### `enableView(key: any) => Promise<void>`

This method serve to enable a view. By default all views are enabled.

#### Returns

Type: `Promise<void>`



### `getChart(idChart: any, isAnnotation?: boolean) => Promise<any>`



#### Returns

Type: `Promise<any>`



### `refreshLinks() => Promise<void>`

This function is to refresh the status of the links and connection

#### Returns

Type: `Promise<void>`



### `refreshSvg() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `resetDashboard() => Promise<void>`

This function is to clear all of elements in dashboard
It will be run when clicking re-run for new query in initial point

#### Returns

Type: `Promise<void>`



### `setAPIRoutes(data: any) => Promise<void>`

This method serve to set the routes used to retrieve data dynamically. Used to explore data through SPARQL queries or dynamically retrieved filenames.

#### Returns

Type: `Promise<void>`



### `setDashboard() => Promise<void>`

This method serve to launch the dashboard using the provided data or SPARQL query

#### Returns

Type: `Promise<void>`



### `setData(data: any, stylesheet: any) => Promise<void>`

This function allows to set the data for the visualization

#### Returns

Type: `Promise<void>`



### `setDataByQuery(values: any) => Promise<void>`

This method serve to start the visualization through a SPARQL query. It process the query, retrieves the data and stores it in a global variable (state)

#### Returns

Type: `Promise<void>`



### `setFilenames(data: any) => Promise<void>`

This method serve to set the list of filenames to be retrieved dynamically from the server.  It is used for custom and static applications.

#### Returns

Type: `Promise<void>`



### `setQueries(data: any) => Promise<void>`

This method serve to populate the query panel with a list of pre-defined queries, usually created through LDViz.

#### Returns

Type: `Promise<void>`



### `setQueryParameters(params: any) => Promise<void>`

This method serve to provide pre-defined values for query custom variables, such as country names, institutions, etc.

#### Returns

Type: `Promise<void>`



### `showView(view: any) => Promise<void>`

This function is to show the view includes chart
It will be updated depend on the status of the view in tree history

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
