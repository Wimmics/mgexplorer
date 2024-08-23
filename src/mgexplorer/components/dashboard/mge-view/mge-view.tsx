import { Component, Element, Host, Prop, h, Method, Watch} from '@stencil/core';
import state from "../../../store"
import {toPng, toSvg} from 'html-to-image';
import { pointer, select, selectAll } from 'd3-selection';
import Swal from 'sweetalert2';
import { takeScreenshot } from '../../../utils/utils';


@Component({
  tag: 'mge-view',
  styleUrl: 'mge-view.css',
  shadow: true,
})
export class MgeView {

@Element() element: HTMLElement;
  /** represents the width of the view displayed by the window*/
  @Prop() width: number = 350;
  /** represents the height of the view displayed by the window*/
  @Prop() height: number = 350;
  /** represents type of visualization technique displayed via content of the view*/
  @Prop() typeVis: string;
   /** represents ID of the view*/
  @Prop() idView: string;
  /** The dataset name being used */
  @Prop() datasetName: string = "[]";
  /** The title of the view */
  @Prop() titleView:string = "[]";
  /** x-coordinate (The horizontal value in a pair of coordinates) of view's position*/
  @Prop() x:number = 0;
  /** y-coordinate (The vertical value in a pair of coordinates) of view's position*/
  @Prop() y:number = 0;
  /** Id of dashboard which is containing this view */
  @Prop() idDash : string;

  @Watch("x")
  validateName(newValue: number, oldValue: number) {
    this._position.x = this.x;
    this._position.y = this.y;
    this._center.cx = this._position.x + this._dimView.width / 2;
    this._center.cy = this._position.y + this._dimView.height / 2;
    
  }
  @Watch("height")
  @Watch("width")
  updateDimview(newValue: number, oldValue: number) {
    this._dimView.width = this.width;
    this._dimView.height = this.height + this._barTitleHeight;
    this._center.cx = this._position.x + this._dimView.width / 2;
    this._center.cy = this._position.y + this._dimView.height / 2;
    
  }

  // private datatype = "number";


  private pos1;
  private pos2;
  private pos3;
  private pos4;
  private mover;
  private cont;
  // private resizer;
  private _dashboard;
  // private _selectOrder = null;
  // private _selectAttr = null;
  /** View center point */
  @Prop({ mutable: true }) _center = { cx: 0, cy: 0 };
  /** View current position */
  @Prop({ mutable: true }) _position = { x: 0, y: 0};
  /** Title bar height */
  @Prop({ mutable: true }) _barTitleHeight = 15;  // Title bar height
  /** View dimensions */
  @Prop({ mutable: true }) _dimView = { width: 10, height: 10 };
  /** Div that represents the header part of a view */
  @Prop({ mutable: true }) _top;
  /**  Div that represents the content includes chart of a view  */
  @Prop({ mutable: true }) _content;
  /**  Div that represents the filter panel of a view  */
  @Prop({ mutable: true }) _filter;
  /**  Chart associated with view  */
  @Prop({ mutable: true }) _chart; // Chart associated with view
  /**  Div that represents the view included  */
  @Prop({ mutable: true }) viewDiv;

  private selLinkPai;
  private selLinkFilhos;
  private selConect;
  private selLinkPaiArrow;
  private selLinkFilhosArrow;

  private _selectedQuery;
  private _contextMenu;
  private _classViewMapping;

  private _dashboardArea;
  private listHasFilter=["mge-nodelink", "mge-iris"]

  constructor(){

    this._selectedQuery;

    this._classViewMapping = {
      'IC-node': 'mge-iris',
      'IC-bars': 'mge-iris',
      'NE-node': 'mge-nodelink',
      'NE-edge':'mge-nodelink',
      'CV-node': 'mge-clustervis',
      'PL-infos': 'mge-listing',
      'PL-title': 'mge-listing',
      'HC-bars': 'mge-barchart',
      'GM-node': 'mge-glyph-matrix'
    }

    this._contextMenu = { 
      showing: false, 
      vItems: Object.fromEntries(Object.keys(state.views).filter(d => state.views[d].contextmenu).map(d => ([d, null]) )) 
    }

    this._dashboardArea = {
                div: null,
                dash: null,
                svg: null,
                width: 0,
                height: 0
            };

    this._dashboard = document.querySelector("mge-dashboard")
    
    this.pos1 = 0;
    this.pos2 = 0;
    this.pos3 = 0;
    this.pos4 = 0;
    this._dimView.width = this.width;
    this._dimView.height = this.height + this._barTitleHeight;
    this._position.x = this.x;
    this._position.y = this.y;
    this._center.cx = this._position.x + this._dimView.width / 2;
    this._center.cy = this._position.y + this._dimView.height / 2;

    if (this.typeVis != "mge-history"){
      state.indexChart++;
    }
    
  }
  /** Refresh bar title width when we resize the windown
    */
  @Method()
  async _refreshBarTitle() {
      this._top.attr("width", this._dimView.width).attr("height", this._barTitleHeight);
  }
  
  setResizable(){
    let globalThis = this;
    var startX, startY, startWidth, startHeight, h , w;
    const resizers = selectAll(this.element.shadowRoot.querySelectorAll('.resizer'));

    // Loop over them
    [].forEach.call(resizers.nodes(), (resizer) => {
      resizer.onmousedown = initDragResize.bind(this);  
    });
    // elm.onmousedown = initDragResize.bind(this);
    
    function initDragResize(event) {
      event = event || window.event;
      event.preventDefault();
      // Get the current mouse position
      startX = event.clientX;
      startY = event.clientY;

      // Calculate the dimension of element
      const styles = window.getComputedStyle(this.element.shadowRoot.querySelector("#" + this.idView + "-g"  ));
      w = parseInt(styles.width, 10);
      h = parseInt(styles.height, 10);
      this.selLinkPai = select(this._dashboard.shadowRoot.querySelector(".F-" + this.idView));
      this.selLinkFilhos = selectAll(this._dashboard.shadowRoot.querySelectorAll(".P-" + this.idView));
      this.selConect = select(this._dashboard.shadowRoot.querySelector("." + this.idView));
      this.selLinkPaiArrow = select(this._dashboard.shadowRoot.querySelector(".FA-" + this.idView));
      this.selLinkFilhosArrow = selectAll(this._dashboard.shadowRoot.querySelectorAll(".PA-" + this.idView));
      
      document.onmousemove = doDragResize.bind(this);
      document.onmouseup = stopDragResize.bind(this);
    }

    function doDragResize(e) {
      let aspect = this._dimView.height / this._dimView.width;

      // Updates the dimensions of the <div>
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;

      this._dimView.width = w + dx -2;
      this._dimView.height = h + dy -2;
      this._dimView.height = this._dimView.height - this._barTitleHeight;

      if (this._dimView.width >= 0 && this._dimView.height >= 0){
        this._refreshBarTitle();
        this._chart.setBox({ width: this._dimView.width, height: this._dimView.height });
        this._center.cx = this._position.x + this._dimView.width / 2;
        this._center.cy = this._position.y + this._dimView.height / 2;
        
        if (!this.selLinkPai.empty()) {
            let dt = this.selConect.datum();
            this.selLinkPai.attr("x2", this._center.cx).attr("y2", this._center.cy);
            this.selConect.attr("x", this._center.cx - 6).attr("y", this._center.cy - 6);
            dt[0].x = this._center.cx;
            dt[0].y = this._center.cy;
        }
        this.selLinkFilhos.attr("x1", this._center.cx).attr("y1", this._center.cy);
        if (!this.selLinkPaiArrow.empty())
          this.selLinkPaiArrow.attr("targetX", this._center.cx).attr("targetY", this._center.cy).attr("refX", (Math.sqrt((this._center.cx - this.selLinkPaiArrow.attr("sourceX"))**2 + (this._center.cy - this.selLinkPaiArrow.attr("sourceY"))**2) / 3.5));

        if (!this.selLinkFilhosArrow.empty())
          this.selLinkFilhosArrow.attr("sourceX", this._center.cx).attr("sourceY", this._center.cy).attr("refX", (Math.sqrt((this.selLinkFilhosArrow.attr("targetX") - this._center.cx)**2 + (this.selLinkFilhosArrow.attr("targetY") - this._center.cy)**2 ) / 3.5));
        this._dashboard.refreshSvg();
      }

            
    }

    function stopDragResize(e) {
        document.onmouseup = null
        document.onmousemove = null
    }
  }

  /**
   * Get the selection of the visualization technique element which containing in this view
   */
  @Method()
  async getChart(){
    return this._chart;
  }

  dragElement (elm) {
    elm.onmousedown = this.dragMouseDown.bind(this);
  }

  elementDrag (event) {
    event = event || window.event;
    this.selLinkPai = selectAll(this._dashboard.shadowRoot.querySelectorAll(".F-" + this.idView));
    this.selLinkFilhos = selectAll(this._dashboard.shadowRoot.querySelectorAll(".P-" + this.idView));
    this.selConect = select(this._dashboard.shadowRoot.querySelector("." + this.idView));
    this.selLinkPaiArrow = selectAll(this._dashboard.shadowRoot.querySelectorAll(".FA-" + this.idView));
    this.selLinkFilhosArrow = selectAll(this._dashboard.shadowRoot.querySelectorAll(".PA-" + this.idView));
    this.moveWindow(event.clientX, event.clientY);

  }

  moveWindow (x, y) {
    
    this.pos1 = this.pos3 - x
    this.pos2 = this.pos4 - y
    this.pos3 = x
    this.pos4 = y

    const parent = select(this.element.parentNode).node().getBoundingClientRect()
    let top = Math.max(0, this.cont.offsetTop - this.pos2)
    top = Math.min(top, parent.height - this._dimView.height + 30)

    let left = Math.max(0, this.cont.offsetLeft - this.pos1)
    left = Math.min(left, parent.width - this._dimView.width)

    this.cont.style.top = top + 'px'
    this.cont.style.left = left + 'px'

    this._position.x = Math.max(0, this.cont.offsetLeft)
    this._position.y = Math.max(0, this.cont.offsetTop)

    this._center.cx = this._position.x + this._dimView.width / 2
    this._center.cy = this._position.y + this._dimView.height / 2

    if (!this.idView.indexOf("annotation")){
      let result =selectAll(this._dashboard.shadowRoot.querySelectorAll("." + this.idView))
      result.attr("x", this._center.cx - 6).attr("y", this._center.cy - 6);  
    }

    if (!this.selLinkPai.empty()) {
        this.selLinkPai.attr("x2", this._center.cx).attr("y2", this._center.cy);
        this.selConect.attr("x", this._center.cx - 6).attr("y", this._center.cy - 6);
    }

    if (!this.selLinkPaiArrow.empty())
      this.selLinkPaiArrow.attr("targetX", this._center.cx).attr("targetY", this._center.cy).attr("refX", (Math.sqrt((this._center.cx - this.selLinkPaiArrow.attr("sourceX"))**2 + (this._center.cy - this.selLinkPaiArrow.attr("sourceY"))**2) / 3.5));

    if (!this.selLinkFilhosArrow.empty())
      this.selLinkFilhosArrow.attr("sourceX", this._center.cx).attr("sourceY", this._center.cy).attr("refX", (Math.sqrt((this.selLinkFilhosArrow.attr("targetX") - this._center.cx)**2 + (this.selLinkFilhosArrow.attr("targetY") - this._center.cy)**2 ) / 3.5));

    this.selLinkFilhos.attr("x1", this._center.cx).attr("y1", this._center.cy);
    this._dashboard.refreshSvg()
  }

  closeDragElement () {
    /* stop moving when mouse button is released: */
    document.onmouseup = null
    document.onmousemove = null
  }

  // Events
  dragMouseDown (event) {
    event = event || window.event
    event.preventDefault();

    this.pos3 = event.clientX
    this.pos4 = event.clientY
    
    document.onmouseup = this.closeDragElement.bind(this);

    document.onmousemove = this.elementDrag.bind(this);
  }

  /**
   * Set new center point for the view
   * Inputs are coordinates (x and y) of new center position
   */
  @Method()
  async setCenter (x, y) {
      this._center.cx = x;
      this._center.cy = y;
      this._position.x = this._center.cx - this._dimView.width / 2;
      this._position.y = this._center.cy - this._dimView.height / 2;
    };

  /**
   * Get current center position of the view
   */
  @Method()
  async getCenter () {
      return this._center;
    };

  /**
   * Get ID of the view
   */
  @Method()
  async idChart () {
      return this.idView;
    };

  /**
   * this function allows to Refresh position of the view
   */
  @Method()
  async refresh () {
      this.viewDiv.node().style.top = this._position.y + "px";
      this.viewDiv.node().style.left = this._position.x + "px";
  };

  /**
   * This function allows to set new title for the view
   */
  @Method()
  async setTitle(_){
    this.titleView = _
    this._top.attr("title", this.titleView);
    select(this.element).attr("titleView", this.titleView);
    select(this.element.shadowRoot.querySelector(".title")).text(_)
  }

  getAllStyles(elem) {
    if (!elem) return []; // Element does not exist, empty list.
    var win = document.defaultView || window, style, styleNode = {};
    if (win.getComputedStyle) { /* Modern browsers */
        style = win.getComputedStyle(elem, '');
        for (var i=0; i<style.length; i++) {
            Object.assign(styleNode,  { [style[i]] : style.getPropertyValue(style[i])});
            //               ^name ^           ^ value ^
        }
    } else if (elem.currentStyle) { /* IE */
        style = elem.currentStyle;
        for (var name in style) {
            Object.assign(styleNode, { [name] : style[name]} );
        }
    } else { /* Ancient browser..*/
        style = elem.style;
        for (var i=0; i<style.length; i++) {
            Object.assign(styleNode, { [style[i] ] : style[style[i]]} );
        }
    }
    return styleNode;
  }

  addTopContent(){
    if (this.listHasFilter.includes(this.typeVis)){

      let _btnMenu = this._top.append("button")
            .attr("id", this.idView + "-t-menu-btn")
            .attr("class", "fas fa-angle-double-down"),
          _btnSaveScreen = this._top.append("button")
            .attr("id", this.idView + "-t-screenshot-btn")
            .attr("class", "fas fa-camera");

      _btnMenu.on("click", (event, d) => {
          let path = event.path || event.composedPath()
          if (this._filter.style.display == "none")
          {
              this._filter.style.display = "block";
              path[0].className = "fas fa-angle-double-up";
          } 
          else
          {
            path[0].className = "fas fa-angle-double-down";
            this._filter.style.display = "none";
          }
      })
      
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
            
            const node = this.viewDiv.node()

            let scale = 2
            const options = { 
                quality: 1.0,
                backgroundColor: '#FFFFFF',
                width: this.viewDiv.node().scrollWidth * scale, 
                height: this.viewDiv.node().scrollHeight * scale,
                style: {left: '0',
                      right: '0',
                      bottom: '0',
                      top: '0',
                      transform: 'scale('+scale+')',
                      transformOrigin: 'top left'}
            }

            if (result.value === 'svg'){
              toSvg( node, options )
              .then( dataURL => takeScreenshot(dataURL, result.value, this.typeVis))
              .catch( error => showError(error));
            } else {
              toPng( node, options )
              .then( dataURL => takeScreenshot(dataURL, result.value, this.typeVis))
              .catch( error => showError(error));
            }
          })   
        })
      }

      if (this.typeVis == 'mge-query'){
        this._top.style('background-color', '#de425b')
      } else if (this.typeVis == 'mge-annotation') {
        this._top.style('background-color', '#f3993b')
      }

      this._top.append("span")
              .attr("class", "title")
              .attr("id", this.idView + "-t-title")
              .style("white-space", "nowrap")
              .style("overflow", "hidden")
              .style("text-overflow", "ellipsis")
              .style("width", 0)
              .text(this.titleView);

      if (this.typeVis != 'mge-history' && this.idView != "chart-0")
        this._top.append("button")
              .attr("class", "fas fa-times")
              .attr("id", this.idView + "-t-close-btn")
              .on("click", async (event, d) => {
                await this._dashboard.closeView(this.element);
              });

  };

  addChartContent(div){
    div.append(this.typeVis).attr("dataset-name", this.datasetName)
                            .attr("id", this.idView)
                            .attr("id-dash", this.idDash);
    this._chart = this.element.shadowRoot.querySelector(this.typeVis)

  }

  async addSettingsContent(){
    if (!this.listHasFilter.includes(this.typeVis)) return
    
    let _filterDiv = this.viewDiv.append("mge-panel")
                    .attr("id", this.idView + "-p")
                    .attr("type-vis", this.typeVis)
                    .attr("id-view", this.idView)
                    .style("display", "none");

    this._filter = _filterDiv.node()
    
    this._filter.setChart(this._chart)
    
    await this._chart.setPanel(this._filter)
    
  }

  async buildChart(div, height){
    this._top = div.append("div")
                  .attr("class", "top")
                  .attr("id", this.idView + "-t")
                  .attr("title", this.titleView)
                  .style("height", this._barTitleHeight)
                  .style("overflow", "hidden");

    this._content = div.append("div")
                  .attr("class", "content")
                  .attr("id", this.idView + "-c")
                  .style("width", this.width + "px")
                  
    if (height) this._content.style("height", height + "px")


    this.addTopContent();
    this.addChartContent(this._content);
    this.addSettingsContent();

  }

  _onMouseOverContent(event, d) {
      select(this.element.shadowRoot.querySelector(".resizer-i")).classed("resizer-autohide", false)
  }

  /**
   * _onMouseOutContent
   */
  _onMouseOutContent(event, d) {
    select(this.element.shadowRoot.querySelector(".resizer-i")).classed("resizer-autohide", true)
      
  }

  /**
   * Set visible for all contents in view
   * if input status is true, the content wil be visible
   * if input status is false, the content will be hidden
   */
  @Method()
  async setVisible(status){
    if (status)
        this.cont.style.display = "block";
    else
        this.cont.style.display = "none";

  }

  /**
   * Set new position for the view
   * Inputs are coordinates : x and y
   */
  @Method()
  async setPosition(x, y){
      this.x = x;
      this.y = y;
  }

  /**
   * Get current position of the view
   */
  @Method()
  async getPosition(){
      return this._position;
  }

  _initAction(){
    
    this._dashboardArea.dash = select(this.element)

    this._dashboardArea.dash.classed("DS-viewArea", true)
        .on("click", (event) => {
            if (event.detail === 1) {this._onClickAction.bind(this)(event)} else if (event.detail === 2) {
            this._dblClickAction.bind(this)(event)
            }
        })
        .on("contextmenu", this._onContextMenu.bind(this))

  }

  _onClickAction(event) {
      if (this._contextMenu.showing && this._contextMenu.showing !== "keep") {
          this._contextMenu.showing = false;
          selectAll(this.element.shadowRoot.querySelectorAll(".DS-popup")).remove();
          select("#subContextMenuDiv").remove();
      }
  }

  _onContextMenu(event) {
    let clickedElem, viewDiv, popupDiv, mousePos;
    
    event.preventDefault();
    
    if (this._contextMenu.showing) {
      event.preventDefault();
      this._contextMenu.showing = false;
      selectAll(this.element.shadowRoot.querySelectorAll(".DS-popup")).remove();
    }

    if (event.composedPath()[0].nodeName !== this.typeVis) { // what the hell?
      this._contextMenu.showing = true;

      clickedElem = select(event.composedPath()[0]);
    }

    viewDiv = this._findParentDiv(clickedElem);
    mousePos = pointer(event, viewDiv.node());
    popupDiv = viewDiv.append("div")
            .attr("class", "DS-popup big-size")
            .style("left", mousePos[0] + "px")
            .style("top", mousePos[1] + "px");

    this._contextMenu.showing = true;

    let key = Object.keys(this._classViewMapping).find(key => clickedElem.node().classList.contains(key))
    let menuid = this._classViewMapping[key]
    
    if (menuid) {
        switch(key){
            case 'IC-bars':
                clickedElem = select(clickedElem.node().parentNode.parentNode)
                break;
            case 'HC-bars':
                clickedElem = select(clickedElem.node().parentNode)
                break;
        }

        this.execContextMenu(menuid, popupDiv, clickedElem.datum(), viewDiv.node(), key)
    }
  }

    _dblClickAction(event) {
        let clickedElem = select(event.composedPath()[0]);
        let viewDiv = this._findParentDiv(clickedElem);
        if (clickedElem.classed("IC-node")) {
            let data = this._contextMenu.vItens['mge-iris'];
            data[0].fActionNode(clickedElem.datum(), viewDiv.node())
        }
    }

  //------------
    _findParentDiv(clickedElem) {
        
        let nodeElem = clickedElem.node();
        while (nodeElem.parentNode != null && nodeElem.parentNode.className !== "hydrated") {
            nodeElem = select(nodeElem.parentNode).node();
        }
        return select(nodeElem.parentNode)
    }

    execContextMenu(menuid, popupDiv, data, parentNode, target) {
        
        popupDiv.selectAll("div")
            .data(this._contextMenu.vItems[menuid])
            .enter()
            .append("div")
            .on("click", (event, d) => {
                this._contextMenu.showing = false;
                selectAll(this.element.shadowRoot.querySelectorAll(".DS-popup")).remove()

                if (target === 'NE-edge') 
                d.fActionEdge(menuid, d.key, data, parentNode, target)
                else 
                d.fActionNode(menuid, d, data, parentNode, target)
            })
            .append("label")
            .text(function (d) { return d.label; });
    }

    //---------------------------------     
    setItemsContextMenu = function (codChart, items) {
        this._contextMenu.vItems[codChart] = items;
    }

    _initContextMenu() {

        Object.keys(this._contextMenu.vItems).forEach(key => {

            if (!state.views[key].enabled) return;
            
            // ignore disabled views
            let enabledViews = state.views[key].contextmenu.filter(d => state.views[d].enabled)

            let values = enabledViews.map(d => {
                return {
                    key: d,
                    label: state.views[d].title(),
                    fActionNode: this._fActionNode.bind(this),
                    fActionEdge: this._fActionEdge.bind(this)
                }
            })

            if (key === 'mge-nodelink') {
                let query = state._queries[this.datasetName]
                let redirectServices = query && query.stylesheet && query.stylesheet.services != undefined;
                
                if (redirectServices) {
                    query.stylesheet.services.forEach(d => {
                        values.push({
                            key: 'service',
                            label: d.label, 
                            fActionNode: this._fActionNode.bind(this), 
                            fActionEdge: this._fActionEdge.bind(this)
                        })
                    })
                }
            }

            this.setItemsContextMenu(key, values)
        })
    }

    async _fActionNode(from, d, node, parentNode, target) {

        const launchService = () => {
            let query = state._queries[this.datasetName]
        
            const baseUrl = query.stylesheet.services.filter(e => e.label == d.label)[0].url;
            
            if (d.label === 'ACTA' && !node.pmid) {
                alert("ACTA is only available for scholarly articles with an associated PubMed ID.")
                return;
            }

            let uri = node.labels ? node.labels[1] : node.link
            let url = baseUrl + encodeURIComponent(d.label == 'ACTA' ? node.pmid : uri);

            window.open(url); 
        }

        switch(from) {
            case 'mge-iris':
                let vOrder = await parentNode.getVOrder()
                let targetNode = await parentNode.dataVisToNode(vOrder[node.indexData])
                if (target === "IC-node") {
                    this._showChart(targetNode, parentNode.id, d.key, false, undefined)
                } else {
                    let sourceNode = await parentNode.getSourceObject()
                    this._showChart(d.key === 'mge-listing' ? sourceNode : targetNode, parentNode.id, d.key, true, targetNode)
                }
                break;
            default:
                if (d.key === 'service') launchService()

                else if (['mge-clustervis'].includes(from) && ['mge-barchart', 'mge-listing'].includes(d.key))
                    this._showChart(node, parentNode.id, d.key, false, undefined, true)

                else this._showChart(node, parentNode.id, d.key, false, undefined)
        }
    }

    async _fActionEdge(from, to, node, parentNode, target) {
        console.log('_fActionEdge is not yet implemented!')
        // TODO: implement this method if necessary
    }

  /**
   * This function allows to create a new view from current view.
   * After create a new view , it will be added to the dashboard with a generated title
   * view: information on view to be created (from state)
   */
  @Method()
    async _showChart(node, parentId, component, isFromEdge=false, secondNode=null, isFromCluster=false, isFromHC=false) {

        let chartNode, viewChild, link, convertData;
        var parentPosition = await this.getPosition()
        var childId = "chart-" + state.indexChart;
        state._id_parent = childId;
        let _viewChild = select(this._dashboard.shadowRoot.querySelector(".graph"))
                        .append("mge-view")
                        .attr("x", parentPosition.x + 30)
                        .attr("y", parentPosition.y + 30)
                        .attr("dataset-name", this.datasetName)
                        .attr("type-vis", component)
                        .attr("id-view", childId);

        chartNode = await _viewChild.node().getChart()
        
        await chartNode.setData(node, state._data[this.datasetName], secondNode, isFromEdge, isFromCluster, isFromHC)

        convertData = await chartNode.setData()
        state.savedData = convertData;
        viewChild= _viewChild.node();

        let title = state.views[component].title(component === 'mge-query' ? 'Follow Up' : null) 
        
        if (component != 'mge-nodelink') {
        if (secondNode) {
            title = `${title} (${node.labels[1]} and ${secondNode.labels[1]})`
        } else if (node) {
            if (node.labels) 
            title = `${title} (${node.labels[1]})`
            else if (node.label) {
            title = `${title} (${node.label})`
            }
        }
        } 
        
        await viewChild.setTitle(title)

        link = await this._dashboard._addLink(this.element, viewChild)

        await this._dashboard.addChart(parentId, {
                id: childId, title: title, typeChart: component.component, hidden: false,
                x: viewChild.x, y: viewChild.y, view: viewChild, link: link
            })

        await this._dashboard.refreshLinks()

        return _viewChild
    }

    @Method()
    async setDatasetName(value) {
        this.datasetName = value;
    }

    componentDidRender(){    
        this._initContextMenu();
        this._initAction();
        this.selLinkPai = select(this._dashboard.shadowRoot.querySelector(".F-" + this.idView));
        this.selLinkFilhos = selectAll(this._dashboard.shadowRoot.querySelectorAll(".P-" + this.idView));
        this.selConect = select(this._dashboard.shadowRoot.querySelector("." + this.idView));
        this._position.x = this.x;
        this._position.y = this.y;
        this._center.cx = this._position.x + this._dimView.width / 2;
        this._center.cy = this._position.y + this._dimView.height / 2;
    }

    componentDidLoad(){
      
      let height = this.element.clientHeight
      this.viewDiv = select(this.element.shadowRoot.querySelector("#" + this.idView + "-g"  ))
                        // .attr("width", this.width)
                        // .attr("height", this.height)
                        .style("left", this._position.x +"px")
                        .style("top", this._position.y +"px")
                        .style("position", "absolute")
                        .style("box-shadow", "0 2px 4px rgb(0 0 0 / 20%")
                        .on("mouseover", this._onMouseOverContent.bind(this))
                        .on("mouseout", this._onMouseOutContent.bind(this));
                        
      this.buildChart(this.viewDiv, height);
      this.mover = this.element.shadowRoot.querySelector("#" + this.idView + '-t');
      this.cont = this.element.shadowRoot.querySelector("#" + this.idView + "-g");
      this.dragElement(this.mover);
      this.setResizable();
    }


    render() {
        return (
            <Host>
            <div id={ this.idView + "-g" } >
                <div class="resizer resizer-i resizer-autohide"></div>
                <div class="resizer resizer-r"></div>
                <div class="resizer resizer-b"></div>
            </div>
            </Host>
        );
    }

}
