import { Component, Element, Host, Prop, h, Method, State} from '@stencil/core';
import { select, selectAll } from 'd3-selection';

import { drag } from 'd3-drag';
import state from "../../../store"
import { toPng, toSvg } from 'html-to-image';
import Swal from 'sweetalert2';
import { takeScreenshot, screenshotOptions } from '../../../utils/utils';

import { processQuery, getResult } from '../../../../lib/query-helper';

@Component({
    tag: 'mge-dashboard',
    styleUrl: 'mge-dashboard.css',
    shadow: true,
})

export class MgeDashboard {
    
    @Element() element: HTMLElement;
    /** type of visualization which want to create in inital point */
    @Prop() initComponent: any = 'mge-query';
    private title: string = "[]";
    /** x-coordinate (The horizontal value in a pair of coordinates) of the dashboard*/
    @Prop({ mutable: true }) x:number=0;
    /** y-coordinate (The vertical value in a pair of coordinates) of the dashboard*/
    @Prop({ mutable: true }) y:number=0;
    /** First view of the dashboard. It depends on the value of initComponent to define what visualization technique or initial query is the first view to be initialized with.*/
    @Prop({ mutable: true }) _initView;
    /** The dataset name being used */
    @Prop({ mutable: true }) datasetName:string; 
    /** Stores the tree of connections between views */
    @Prop({ mutable: true }) _treeCharts = null;      // Stores the tree of connections between views
    /** Stores the graph that contains history */
    @Prop({ mutable: true }) _historyChart = null;     // Stores the graph that contains history
    
    // @Prop({ mutable: true }) _selectedQuery;
    /** Area of dashboard for interacting*/
    @Prop({ mutable: true }) _dashboardArea;
    /** Drag connection of views */
    @Prop({ mutable: true }) _dragConect;
    // @Prop({ mutable: true }) _configView = {};
    
    @Prop({ mutable: true }) _annotationChart = null;
    
    @Prop({ mutable: true }) _historydata;
    
    constructor(){
        
        this._treeCharts = null,       // Stores the tree of connections between views
        this._historyChart = null,     // Stores the graph that contains history
        this._annotationChart = null, 
        
        this._dashboardArea = {
            div: select(this.element.parentNode),
            dash: null,
            svg: null,
            width: null,
            height: 0
        };
        
        this._dashboardArea.width = this._dashboardArea.div.node().clientWidth;
        this._dashboardArea.height = this._dashboardArea.div.node().clientHeight;

        const that = this;
        this._dragConect = drag().on("drag", function (e, d) {return that._onDragConect.call(this, e, d, that)});
        this.datasetName = state.getDataKey()
    }
    
    /**
    * This method serve to disable a view. By default all views are enabled.
    * @param key The component name
    */
    @Method()
    async disableView(key) {
        if (key === 'mge-nodelink') throw new Error("This view cannot be disabled!")
            
        let view = state.views[key]
        if (view)  
            view.enabled = false
        else throw new Error("Unknown key")
    }
    
    /**
    * This method serve to enable a view. By default all views are enabled.
    * @param key The component name
    */
    @Method()
    async enableView(key) {    
        let view = state.views[key]
        if (view)  
            view.enabled = true
        else throw new Error("Unknown key")
    }
    
    /**
    * This method serve to enable/disable the cache. If enabled, you must provide the corresponding API routes. 
    * @see {@link setAPIRoutes} for setting the API routes.
    * @param value A boolean value
    */
    @Method()
    async cache(value) {
        state._cache = value
    }
    
    /**
    * This method serve to provide pre-defined values for query custom variables, such as country names, institutions, etc.
    * @param params An object with pre-defined values, such as the ones found in LDViz
    */
    @Method()
    async setQueryParameters(params) {
        state.globalParams = params
    }
    
    /**
    * This method serve to populate the query panel with a list of pre-defined queries, usually created through LDViz.
    * @param data A list of queries (see LDViz model)
    */
    @Method()
    async setQueries(data) {
        state.queriesList = data
    }
    
    /**
    * This method serve to set the routes used to retrieve data dynamically. Used to explore data through SPARQL queries or dynamically retrieved filenames.
    * @param data A JSON array containing objects the API route, type and headers
    */
    @Method()
    async setAPIRoutes(data){
        state.routes = data
    }
    
    /**
    * This method serve to set the list of filenames to be retrieved dynamically from the server.  It is used for custom and static applications.
    * @param data A list of filenames stored in the server.
    */
    @Method()
    async setFilenames(data) {
        state.filenames = data
        state._static = true
    }
    
    /**
    * This method serve to start the visualization through a SPARQL query. It process the query, retrieves the data and stores it in a global variable (state)
    * @param values A JSON object containing a SPARQL query (mandatory), a SPARQL endpoint (mandatory) and a stylesheet (optional)
    * @throws {Error} If query or endpoint are empty
    */
    @Method()
    async setDataByQuery(values) {
        if (!values.query || !values.endpoint) {
            throw new Error("Please provide a valid query and endpoint.")
        }
        
        let queryData = {
            query: values.query.replace(/\\n/g, "\n").replace(/\\"/g, '\"'),
            endpoint: values.endpoint,
            stylesheetActive: values.stylesheet !== undefined,
            stylesheet: typeof values.stylesheet === 'string' ? JSON.parse(values.stylesheet) : values.stylesheet
        } 
        
        this.showLoading()
        this.datasetName = state.getDataKey()
        
        state._queries[this.datasetName] = { ...queryData }
        let data = await processQuery(queryData)

        state._data[this.datasetName] = data.mge || data
        state._stylesheet[this.datasetName] = data.stylesheet
    }
    
    /**
    * This method allosw disable the initial query panel. By default, the dashboard is started with a Query panel.
    */
    @Method()
    async disableInitialQueryPanel() {
        this.initComponent = 'mge-nodelink'
    }
    
    /** 
    * This function allows to set the data for the visualization
    * @param data A JSON array containing the data  
    * @param stylesheet A JSON array containing custom style rules 
    */
    @Method()
    async setData (data, stylesheet) {
        this.datasetName = state.getDataKey()
        
        // Store JSON formatted data to global variable of application 
        state._data[this.datasetName] = await getResult(data, stylesheet)
        state._static = true

        state._stylesheet[this.datasetName] = stylesheet
    }
    
    /**
    * This method serve to launch the dashboard using the provided data or SPARQL query
    * @throws {Error} If the data is empty or not compatible
    */
    @Method()
    async setDashboard(){
        
        let data = state._data[state.getDataKey()]
        
        this.hideLoading()
        
        if (data && data.message) {
            alert(data.message)
            throw new Error(data.message)
        }
        
        let svg = select(this.element.shadowRoot.querySelectorAll(".graph")[0])
        this.draw(svg)

        if (state.views['mge-annotation'].enabled)     
            this.addAnnotation(svg); 
        
    }
    
    /** This function is to create links from parent window and the children windown
    * It includes connection and line links
    * @param viewParent The view element that generated the link
    * @param viewChild The view element created by the interaction
    */
    @Method()
    async _addLink(viewParent, viewChild) {
        let line, conect;
        let centerViewParent = await viewParent.getCenter(),
            centerViewChild = await viewChild.getCenter()

        if (typeof centerViewParent !== "undefined" &&  typeof centerViewChild !== "undefined"){
            this._dashboardArea.svg.select("defs")
                .append("marker")
                    .attr("id", "arrow-PA-" + await viewParent.idChart() + "-FA-" + await viewChild.idChart())
                    .attr("class", "arrow PA-" + await viewParent.idChart() + " FA-" + await viewChild.idChart())
                    .attr("markerWidth", 30)
                    .attr("markerHeight", 30)
                    .attr("orient", "auto").attr("refY", 2)
                    .attr("fill","#3383FF")
                    .attr("refX",140)
                    .attr("sourceX", centerViewParent.cx).attr("sourceY", centerViewParent.cy)
                    .attr("targetX", centerViewChild.cx).attr("targetY", centerViewChild.cy)
                        .append("path").attr("d", "M0,0 L4,2 0,4")
            
            line = this._dashboardArea.svg.insert("line", ".DS-conect")
                .attr("x1", centerViewParent.cx)
                .attr("y1", centerViewParent.cy)
                .attr("x2", centerViewChild.cx)
                .attr("y2", centerViewChild.cy)
                .attr("marker-end", "url(#arrow-PA-" + await viewParent.idChart() + "-FA-" + await viewChild.idChart() + ")")
                .attr("class", "DS-linkChartShow P-" + await viewParent.idChart() + " F-" + await viewChild.idChart())

            conect = this._dashboardArea.svg.append("rect")
                    .datum([{ x: centerViewChild.cx, y: centerViewChild.cy, viewParent: viewParent, viewChild: viewChild }])
                    .attr("class", "DS-conect " + await viewChild.idChart())
                    .attr("x", centerViewChild.cx - 6)
                    .attr("y", centerViewChild.cy - 6)
                    .attr("rx", d => viewChild.typeVis == "mge-query" ? 12 : 0)
                    .attr("ry", d => viewChild.typeVis == "mge-query" ? 12 : 0)
                    .style("fill", d => viewChild.typeVis == "mge-query" ? "rgb(222, 66, 91)" : null)
                    .style("stroke", d => viewChild.typeVis == "mge-query" ? "rgb(222, 66, 91)" : null)
                    .attr("width", 12)
                    .attr("height", 12)
                    .on("click", ()  => {
                        this.showView(viewChild)
                    })
            conect.append("title").text(viewChild.titleView)
            conect.call(this._dragConect)

            // Create circle instead of rect for mge-query 
            if (viewChild.typeDiv == "mge-query"){
                conect.attr("rx", 12).attr("ry", 12)
            }
        }
        return { line: line, conect: conect, visible: true };
    }
    
    @Method()
    async _addLinkAnnotation(viewParents, viewChild) {
        let lines = [], connectingDot,
        centerViewChild = await viewChild.getCenter();
        
        if (viewParents.length == 0) return { lines: [], conect: null, visible: true}
        
        for (let i = 0; i < viewParents.length; i++) {
            let viewParent = viewParents[i],
                line,
                centerViewParent = await viewParent.getCenter()

            if (typeof centerViewParent !== "undefined" &&  typeof centerViewChild !== "undefined"){
                this._dashboardArea.svg.select("defs").append("marker").attr("id", "arrow-PA-" + await viewParent.idChart() + "-FA-" + await viewChild.idChart())
                .attr("class", "arrow PA-" + await viewParent.idChart() + " FA-" + await viewChild.idChart()).attr("markerWidth", 30)
                .attr("markerHeight", 30).attr("orient", "auto")
                .attr("refY", 2)
                .attr("fill","#3383FF")
                .attr("refX",140)
                .attr("sourceX", centerViewParent.cx)
                .attr("sourceY", centerViewParent.cy)
                .attr("targetX", centerViewChild.cx)
                .attr("targetY", centerViewChild.cy)
                .append("path")
                .attr("d", "M0,0 L4,2 0,4");
                
                line = this._dashboardArea.svg.
                insert("line", ".DS-conect")
                .attr("x1", centerViewParent.cx)
                .attr("y1", centerViewParent.cy)
                .attr("x2", centerViewChild.cx)
                .attr("y2", centerViewChild.cy)
                .attr("marker-end", "url(#arrow-PA-" + await viewParent.idChart() + "-FA-" + await viewChild.idChart() + ")")
                .attr("class", "DS-linkChartShow P-" + await viewParent.idChart() + " F-" + await viewChild.idChart());
                lines.push(line)
            }
        }
        
        connectingDot = this._dashboardArea.svg
        .append("rect")
        .datum([{ x: centerViewChild.cx, y: centerViewChild.cy, viewChild: viewChild }])
        .attr("class", "DS-conect " + await viewChild.idChart())
        .attr("x", centerViewChild.cx - 6)
        .attr("y", centerViewChild.cy - 6)
        .attr("rx", d => viewChild.typeVis == "mge-query" ? 12 : 0)
        .attr("ry", d => viewChild.typeVis == "mge-query" ? 12 : 0)
        .attr("width", 12)
        .attr("height", 12)
        .style("fill", d => viewChild.typeVis == "mge-query" ? "rgb(222, 66, 91)" : null || viewChild.typeVis == "mge-annotation" ? "rgb(243, 153, 59)" : null)
        .style("stroke", d => viewChild.typeVis == "mge-query" ? "rgb(222, 66, 91)" : null || viewChild.typeVis == "mge-annotation" ? "rgb(243, 153, 59)" : null)
        .attr("transform", d => viewChild.typeVis == "mge-annotation" ? "rotate(45,0,0)" : null)
        .on("click", ()  => {
            this.showView(viewChild)
        })
        
        connectingDot.append("title").text(viewChild.titleView)
        connectingDot.call(this._dragConect);
        
        return { lines: lines, conect: connectingDot, visible: true };
    }
    
    
    @Method()
    async _addcube(viewChild) {
        let lines = [], conect,
        centerViewChild = await viewChild.getCenter();
        
        conect = this._dashboardArea.svg.
        append("rect")
        .datum([{ x: centerViewChild.cx, y: centerViewChild.cy, viewChild: viewChild }])
        .attr("class", "DS-conect " + await viewChild.idChart())
        .attr("x", centerViewChild.cx - 6)
        .attr("y", centerViewChild.cy - 6)
        .attr("rx", d => viewChild.typeVis == "mge-query" ? 12 : 0)
        .attr("ry", d => viewChild.typeVis == "mge-query" ? 12 : 0)
        .attr("width", 12)
        .attr("height", 12)
        .style("fill", d => viewChild.typeVis == "mge-query" ? "rgb(222, 66, 91)" : null || viewChild.typeVis == "mge-annotation" ? "rgb(243, 153, 59)" : null)
        .style("stroke", d => viewChild.typeVis == "mge-query" ? "rgb(222, 66, 91)" : null || viewChild.typeVis == "mge-annotation" ? "rgb(243, 153, 59)" : null)
        .attr("transform", d => viewChild.typeVis == "mge-annotation" ? "rotate(45,0,0)" : null)
        .on("click", () => {
            this.showView(viewChild)
        })
        conect.append("title").text(viewChild.titleView)
        conect.call(this._dragConect);
        return { lines: lines, conect: conect, visible: true}
        
    }
    
    //---------------------
    /** This function is to show the view includes chart
    * It will be updated depend on the status of the view in tree history
    */
    @Method()
    async showView (view) {
        let that = this;
        if(view.typeVis == "mge-annotation"){
            let nodeTrees = await this.getChart(await view.idChart(), true);
            nodeTrees.forEach(async (nodeTree)=> {showNode(view, nodeTree)})
        }
        else
        {
            let nodeTree = await this.getChart(await view.idChart());
            showNode(view, nodeTree)
        }
        
        function showNode(view, nodeTree){
            
            let node = nodeTree;
            if (node.link != undefined){
                while (node.link.visible === false) {
                    node.link.visible = true;
                    node = node.parentNode;
                    node.isLeaf = false;
                    if (node.parentNode == null)  // Check if root
                    break;
                }
            }
            
            
            nodeTree.hidden = false;
            view.setVisible(true);
            that.refreshLinks();
        }
        
    };
    /** This method hides the given view from the dashboard (CSS - display:none) and update the status of this
    view in the history panel (mge-history).
    */
    @Method()
    async closeView(view) {
        let that = this;
        
        if(view.typeVis == "mge-annotation"){
            let nodeTrees = await this.getChart(await view.idChart(), true);
            nodeTrees.forEach(async (nodeTree)=> {closeNode(view, nodeTree)})
        }
        else
        {
            let nodeTree = await this.getChart(await view.idChart());
            closeNode(view, nodeTree)
        }
        
        function closeNode(view, nodeTree){
            let node = nodeTree;
            
            if (node.isLeaf) {
                while (node != null) {
                    
                    // node.link.visible = false;
                    if (visibleChildren(node.parentNode)) {
                        break;
                    } else {
                        node.parentNode.isLeaf = true;
                    }
                    node = node.parentNode;
                    if (node.hidden === false) {
                        break;
                    }
                }
            }
            nodeTree.hidden = true;
            view.setVisible(false);
            that.refreshLinks();
            
            function visibleChildren(node) {
                if (!node.children)
                    return false;
                return node.children.some(d => d.link.visible)
            }
        }
        
    }
    
    /** Drag event from connection of the views
    */
    async _onDragConect(event, d, globalThis) {
        let dt, line, rects, selPaiArrow, selFilhosArrows;
        d.x = event.x;
        d.y = event.y;
        select(this).attr("x", d.x - 6).attr("y", d.y - 6);
        dt = select(this).datum();
        
        line = globalThis._dashboardArea.svg.selectAll(".F-" + await dt[0].viewChild.idChart())
        rects = globalThis._dashboardArea.svg.selectAll(".P-" + await dt[0].viewChild.idChart())
        
        selPaiArrow = globalThis._dashboardArea.svg.selectAll(".FA-" + await dt[0].viewChild.idChart())
        selFilhosArrows = globalThis._dashboardArea.svg.selectAll(".PA-" + await dt[0].viewChild.idChart())
        if (!line.empty()){
            line.attr("x2", d.x).attr("y2", d.y);
        }
        rects.attr("x1", d.x).attr("y1", d.y);
        if (!selPaiArrow.empty()){
            selPaiArrow.attr("targetX", d.x).attr("targetY", d.y).attr("refX", (Math.sqrt( (d.x - selPaiArrow.attr("sourceX"))**2 + (d.y - selPaiArrow.attr("sourceY"))**2) / 6));
        }
        if (!selFilhosArrows.empty()){
            selFilhosArrows.attr("sourceX", d.x).attr("sourceY", d.y).attr("refX", (Math.sqrt((selFilhosArrows.attr("targetX") - d.x)**2 + (selFilhosArrows.attr("targetY") - d.y)**2) / 6));
        }
        dt[0].viewChild.setCenter(d.x, d.y);    // Move the hidden window
        dt[0].viewChild.refresh();
        dt[0].x = d.x;
        dt[0].y = d.y;
        
    }
    
    @Method()
    async getChart (idChart, isAnnotation=false) {
        if(isAnnotation)
            return getAnnotationRec(this._treeCharts);
        else
        return getChartRec(this._treeCharts);
        
        function getChartRec(nodeTree) {
            let tempNodeTree;
            
            if (nodeTree == null)
                return [];
            
            if ("id" in nodeTree ){
                if (nodeTree.id === idChart) {
                    return nodeTree;
                }
                if (nodeTree["children"] === undefined)
                    return null;
                for (let i = 0; i < nodeTree.children.length; i++) {
                    
                    if (nodeTree.children[i].id.indexOf("annotation")!=0){
                        tempNodeTree = getChartRec(nodeTree.children[i]);
                        if (tempNodeTree != null)
                            return tempNodeTree;
                    }
                    
                }
            }else{
                
                
                if (nodeTree[0]["id"] === idChart){
                    return nodeTree[0];
                }
                
                if (nodeTree[0]["children"] === undefined)
                    return null;
                
                for (let i = 0; i < nodeTree[0].children.length; i++) {
                    tempNodeTree = getChartRec(nodeTree[0].children[i]);
                    if (tempNodeTree != null)
                        return tempNodeTree;
                }
            }
            
            return null;
        }
        function getAnnotationRec(nodeTree) {
            let tempNodeTree, result=[];
            if (nodeTree == null){
                return result;
            }
            
            
            if ("id" in nodeTree){
                
                if (nodeTree.id === idChart) {
                    result.push(nodeTree);
                }
                if (nodeTree["children"] === undefined)
                    return result;
                
                for (let i = 0; i < nodeTree.children.length; i++) {
                    tempNodeTree = getAnnotationRec(nodeTree.children[i]);
                    if (tempNodeTree.length > 0)
                        result = result.concat(tempNodeTree);
                    
                }
            }else {
                
                if (nodeTree[0].id === idChart) {
                    result.push(nodeTree);
                }
                
                if (nodeTree[0].children != undefined) {
                    
                    for (let i = 0; i < nodeTree[0].children.length; i++) {
                        tempNodeTree = getAnnotationRec(nodeTree[0].children[i]);
                        if (tempNodeTree.length > 0)
                            result = result.concat(tempNodeTree);
                        
                    }
                }
                
                
                for (let index = 1; index < nodeTree.length; index++) {
                    const element = nodeTree[index];
                    if (element.id === idChart) {
                        result.push(nodeTree);
                    }
                    // if (element.children === undefined)
                    //   return result;
                } 
            }
            
            
            return result;
        }
    };
    
    /** This method adds a new view to the dashboard and update the tree history with information regarding the new view.
    */
    @Method()
    async addChart (idParent, objChart) {
        
        if (idParent === 0) {
            if (this._treeCharts == null) {
                this._treeCharts = [];
                this._treeCharts.push({
                    id: objChart.id, title: objChart.title, typeChart: objChart.typeChart, hidden: objChart.hidden,
                    x: objChart.x, y: objChart.y, view: objChart.view,
                    parentNode: null, isLeaf: true, link: null
                });
            } else {
                this._treeCharts.push({
                    id: objChart.id, title: objChart.title, typeChart: objChart.typeChart, hidden: objChart.hidden,
                    x: objChart.x, y: objChart.y, view: objChart.view,
                    parentNode: null, isLeaf: true, link: null
                });
                
            }
        } else {
            let nodeTree = await this.getChart(idParent);
            if (nodeTree == null)
                return ;
            if (nodeTree.children === undefined)
                nodeTree.children = [];
            nodeTree.isLeaf = false;
            nodeTree.children.push({
                id: objChart.id, title: objChart.title, typeChart: objChart.typeChart, hidden: objChart.hidden,
                x: objChart.x, y: objChart.y, view: objChart.view,
                parentNode: nodeTree, isLeaf: true, link: objChart.link
            });
        }
        
    };
    
    @Method()
    async refreshSvg () {
        this._dashboardArea.width = this._dashboardArea.div.node().scrollWidth;
        this._dashboardArea.height = this._dashboardArea.div.node().scrollHeight;
        this._dashboardArea.svg.attr("width", this._dashboardArea.width);
        this._dashboardArea.svg.attr("height", this._dashboardArea.height);
    };
    
    /** This function is to clear all of elements in dashboard
    * It will be run when clicking re-run for new query in initial point
    */
    @Method()
    async resetDashboard(){
        selectAll(
            this.element.shadowRoot.querySelectorAll(
                'line, rect, mge-view[id-view]:not([id-view="chart-0"]):not([id-view="chart-history"])'
            )
        ).remove()
        this._treeCharts[0].children = []
        this.refreshLinks()
    }
    
    
    async addAnnotation(_svg) {
        
        let _btnAnnotation = select(this.element.shadowRoot.querySelector("#annotationButton"))
        _btnAnnotation.style('display', 'block')

        _btnAnnotation.on("click", (event, d) => {
            
            let idAnnotation = "annotation-"+state.indexAnnotation;
            this._annotationChart = _svg.append("mge-view")
            .attr("x", this.x + 600)
            .attr("y", this.y)
            .attr("type-vis", "mge-annotation")
            .attr("title-view", idAnnotation)
            .attr("titleview", idAnnotation)
            .attr("id-view", idAnnotation)
            state.annotations[idAnnotation] = {
                "disabled": false,
                "data": ""
            };
            state.indexAnnotation++;
            
            this.refreshLinks();
            let link =this._addcube(this._annotationChart.node());
            this.addChart(0, {
                id: idAnnotation, title: idAnnotation, typeChart: "mge-annotation", hidden: false, link: link,
                x: this.x + 600, y: this.y, view: this._annotationChart.node()
            })
            
        })
    }
    
    addScreenshot(){
        
        let _btnSaveScreen = select(this.element.shadowRoot.querySelector("#captureButton"))

        _btnSaveScreen.on("click", (event, d) => {
            Swal.fire({
                title: '',
                html: `File format: <select class='selectTypeCapture' id='typeCapture'>
          <option value='png'>PNG</option>
          <option value='svg'>SVG</option>
        </select>`,
                confirmButtonText: 'OK',
                showCancelButton: true,
                focusConfirm: false,
                preConfirm: () => {
                    const selectElement = select("#typeCapture").node()
                    const value = selectElement.options[selectElement.selectedIndex].value;
                    return value
                }
            }).then((result) => {
                if (!result.value) return;
                
                /// TO-DO: apply the same to mge-view
                function showError(error){
                    console.error('oops, something went wrong!', error);
                }
                
                let options = screenshotOptions(this._dashboardArea.width, this._dashboardArea.height)
                let node = this.element.shadowRoot.querySelector(".contentDashboard") as HTMLElement
                if (result.value === 'svg'){
                    toSvg( node, options )
                    .then( dataURL => takeScreenshot(dataURL, result.value, ''))
                    .catch( error => showError(error));
                } else {
                    toPng( node, options )
                    .then( dataURL => takeScreenshot(dataURL, result.value, ''))
                    .catch( error => showError(error));
                }
            })   
        });
    }
    
    async draw(_svg){
        
        let viewTitle = state.views[this.initComponent].title('Initial')
        
        let graph = this.element.shadowRoot.querySelector(".graph")
        let historyPanelPos = this.y + 400

        let historyHeight = graph.clientHeight - historyPanelPos - 35 // to fit into small screens
        if (historyHeight > 250) historyHeight = 250 // default height

        this._historyChart = _svg.append("mge-view")
            .attr("x", this.x)
            .attr("y", historyPanelPos)
            .attr("type-vis", "mge-history")
            .attr("title-view", "History")
            .attr("id-view", "chart-history")
            .style('height', historyHeight + "px")
        
        this._initView = _svg
            .append("mge-view")
            .attr("x", this.x)
            .attr("y", this.y)
            .attr("dataset-name", this.datasetName)
            .attr("type-vis", this.initComponent)
            .attr("title-view", viewTitle)
            .attr("titleview", viewTitle)
            .attr("id-view", "chart-0")
        
        if (typeof await this._initView.node().getChart() !== "undefined"){
            let _initView = await this._initView.node().getChart()
            let data = state._data[this.datasetName]
            if (typeof data != 'undefined' && !data.message) {
                await _initView.setData(data, this.datasetName)
            }
            
            if (this.initComponent == "mge-query")
                await _initView.setInitial() // to manage the different types of queries; not necessary for other views
            
        }
        
        this.addChart(0, {
            id: "chart-0", title: viewTitle, typeChart: this.initComponent, hidden: false,
            x: this.x, y: this.y, view: this._initView.node()
        })
        
        await this.refreshLinks()
        this.addScreenshot()
        
    }
    
    /** This function is to refresh the status of the links and connection
    */
    @Method()
    async refreshLinks() {
        refreshLinksRec(this._treeCharts);
        this._historyChart.node().componentOnReady().then(async () => {
            
            let viewChart = await this._historyChart.node().getChart()
            if(typeof viewChart !== "undefined" )
                await viewChart.setTree(this._treeCharts);})
            
            function refreshLinksRec(nodeTree) {
                if (nodeTree != null) {
                    processNode(nodeTree);
                }
                if (nodeTree.children !== undefined) {
                    for (let i = 0; i < nodeTree.children.length; i++) {
                        refreshLinksRec(nodeTree.children[i]);
                    }
                }
            }
            
            function processNode(nodeTree) {
                if (nodeTree.link != null) {
                    if (nodeTree.link.visible) {
                        if (nodeTree.hidden === true || (nodeTree.parentNode.hidden && !nodeTree.hidden)) {
                            nodeTree.link.line.classed("DS-linkChartShow", false);
                            nodeTree.link.line.classed("DS-linkChartHidden", true);
                            // nodeTree.link.line.attr("marker-end", "url(#hidden)")
                        } else {
                            nodeTree.link.line.classed("DS-linkChartShow", true);
                            nodeTree.link.line.classed("DS-linkChartHidden", false);
                            // nodeTree.link.line.attr("marker-end", "url(#arrow" + nodeTree.id)
                        }
                        nodeTree.link.conect.style("display", null);
                        nodeTree.link.line.style("display", null);
                    } else {
                        nodeTree.link.conect.style("display", "none");
                        nodeTree.link.line.style("display", "none");
                    }
                }
            }
        };
        
        componentDidRender(){
            
        }
        
        componentDidLoad(){
            
            this._dashboardArea.svg = select(this.element.shadowRoot.querySelector(".linktool"))
                .attr("width", this._dashboardArea.width)
                .attr("height", this._dashboardArea.height)
                .style("top", 0)
                .style("left", 0)
                .style("right", 0)
                .style("position", "absolute");

            
        }
        
        showLoading(){
            select(this.element.shadowRoot.querySelector('.loading')).node().style.display = 'block'
        }
        
        hideLoading(){
            select(this.element.shadowRoot.querySelector('.loading')).node().style.display = 'none'
        }
        
        showQueryTitle(title){
            select('#vis-title').node().innerHTML += title
        }
        
        render() {
            return (
                <Host>
                <div class="contentDashboard" style={{"width":"100%", "height":"100%"}}>
                
                <div class="action-buttons-container" id='action-buttons'>
                    <button id="captureButton" class="fas fa-camera" title="Take snapshot of dashboard"></button>
                    <button id="annotationButton" class="far fa-sticky-note"  title="New annotation" style={{"display":"none"}}></button>
                </div>

                    <div class="graph">
                        <div class='loading' style={{
                            "position": "absolute",
                            "padding": "10px",
                            "left": "calc(50vw - 250px)",
                            "top": "25vh",
                            "width": "500px",
                            "text-align": 'center',
                            "display": "none"
                        }}>
                            <p>Please hold on while we query the SPARQL endpoint.</p>
                            <i class="fas fa-spinner fa-spin fa-2x" style={{"color": "rgb(31, 119, 180)"}}></i>
                        </div>
                    </div>
                    <svg class="linktool">
                        <defs>
                        </defs>
                    </svg>
                </div>
                </Host>
            );
        }
        
    }
    