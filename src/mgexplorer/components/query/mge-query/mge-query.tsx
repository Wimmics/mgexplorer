import { Component, Element, Host, Prop, h, Method, getAssetPath} from '@stencil/core';
import  { select, selectAll } from 'd3-selection'
import {range} from "d3"
import state from "../../../store"

import { processQuery, clearQueryCache, requestFile } from '../../../../lib/query-helper.js'


@Component({
  tag: 'mge-query',
  styleUrl: 'mge-query.css',
  shadow: false,
})
export class MgeQuery {

@Element() element: HTMLElement;
  @Prop() width: number = 350;
  @Prop() height: number = 350;

  // @Prop() data: any;

  @Prop() data=[];
  /** List of predifined queries */
  @Prop({ mutable: true }) queriesList=null;
  /** Represents the panel associated with the graphic */
  @Prop({ mutable: true }) globalParams = null;
  @Prop({ mutable: true }) form=null
  
  @Prop({ mutable: true }) cloneStatus= {isClone: false, isFirstTime: false};
  private isInitial: boolean = false;

  /** represents the current dashboard */
  @Prop({ mutable: true }) _dashboard;
  /** represents the view includes this follow-up query*/
  @Prop({ mutable: true }) _view;
  private dataset;
  /** represents the current selected query */
  @Prop({ mutable: true }) query;

  private _indexDataset;

  constructor(){
    this._dashboard = document.querySelector("mge-dashboard")
    
    this._indexDataset = 0
  }
  /**
   * Set box size for the chart includes the content
   * input is a object includes height and width
   */
  @Method()
    async setBox (box) {
      select(this.element.querySelector(".query")).style("width", box.width + "px")
                                                  .style("height", box.height + "px");
      select(this.element).attr("height", box.height).attr("width", box.width)
    };

  /**
   * With clone follow-up query, this function will be clone all of data from parent element
   * variable isFirstTime of cloneStatus of this element will be changed to false after cloning data
   */
  @Method()
  async setCloneData(query){
    this.query = query;
    (this.element.querySelector('#form_sparqlEndpoint')as HTMLInputElement).value = this.query.endpoint;
    (this.element.querySelector('#form_sparqlEndpoint') as HTMLInputElement).dispatchEvent(new Event('change'));
    this.displayQuery(query);
    this.cloneStatus.isFirstTime = false
  }

  /**
   * Set type of follow-up query to clone follow-up query
   * It will update value in cloneStatus of element
   */
  @Method()
  async setClone(){
    this.cloneStatus.isClone = true
    this.cloneStatus.isFirstTime = true
  }

  /**
   * With initial query, this function will be set variable isInitial to true
   * This way will help to distinguish the initial point or a follow-up query
   */
  @Method()
  async setInitial(){
    this.isInitial = true
  }

  //---------------------
    /** This function is to set the data to the selected data from parent 
    * If no arguments, It will return the value of data
    */
  @Method()
  async setData(_, oldData){
    if (!arguments.length)
            return this.data;
    this.data = _
  }


  /**
   * Clone function will be call to create a new clone component
   * This function will be run after click clone button
   */
  @Method()
  async  cloneQuery(){
    let cloneView = await this._view._showChart(this.data, this.element.id, 'mge-query')
    cloneView.node().componentOnReady().then(async () => {
          let chartNode = await cloneView.node().getChart();
          await chartNode.setClone();
          await chartNode.setCloneData(this.query);})

  }

  /**
   * display the form with information regarding the selected query
   */
  displayQuery(data) {
    const _this = this;
    
      if (data){
        this.enableButton();
        (this.element.querySelector('#form_sparqlQuery')as HTMLInputElement).value = data.query.replace(/\\n/g, "\n").replace(/\\"/g, '\"');
        (this.element.querySelector('#form_sparqlEndpoint')as HTMLInputElement).value = data.endpoint;
        (this.element.querySelector('#form_query')as HTMLInputElement).value = data.id;
        // (this.element.querySelector('#select_query_type') as HTMLInputElement).value = data.params.type;

        if (data.stylesheet) {
          select(this.element.querySelector('#stylesheet_form')).node().style.display = 'table-row';
          (this.element.querySelector('#input_stylesheet') as HTMLInputElement).checked = data.stylesheetActive;
          (this.element.querySelector('#value_stylesheet') as HTMLInputElement).value = JSON.stringify(data.stylesheet);
        }

        let params = data.params;
        if (params.period && (data.query.includes('$beginYear') || data.query.includes('$endYear'))) {
          select(this.element.querySelector('#period_form')).node().style.display = 'table-row';
          if (data.query.includes('$beginYear')) 
            (this.element.querySelector('#select_from_year') as HTMLInputElement).value = params.period[0];
          if (data.query.includes('$endYear'))
            (this.element.querySelector('#select_to_year') as HTMLInputElement).value = params.period[1];
        }
        else
        {
          select(this.element.querySelector('#period_form')).node().style.display = 'none';
        }

        if (params.lab && params.lab[0] && params.lab[0] !== '' && data.query.includes('$lab1')) {
          select(this.element.querySelector('#lab1_form')).node().style.display = 'table-row';
          (this.element.querySelector('#input_lab1') as HTMLInputElement).value = params.lab[0]
        }
        else select(this.element.querySelector('#lab1_form')).node().style.display = 'none';

        if (params.lab && params.lab[1] && params.lab[1] !== '' && data.query.includes('$lab2')) {
          select(this.element.querySelector('#lab2_form')).node().style.display = 'table-row';
          (this.element.querySelector('#input_lab2') as HTMLInputElement).value = params.lab[1]
        }
        else select(this.element.querySelector('#lab2_form')).node().style.display = 'none';

        if (params.country && params.country !== '' && data.query.includes('$country')) {
          select(this.element.querySelector('#country_form')).node().style.display = 'table-row';
          (this.element.querySelector('#input_country') as HTMLInputElement).value = params.country;
        }
        else
        {
          select(this.element.querySelector('#country_form')).node().style.display = 'none';
        }

        if (params.value && params.value.length && data.query.includes('$value')) {
          select(this.element.querySelector('#values-container')).node().style.display = 'table-row'
          select(this.element.querySelector('#values-container')).selectAll('.custom_value').remove()

          let requiredValues = data.query.match(/\$value\d+/g)
          
          requiredValues = [...new Set(requiredValues)];
          for (let i = 0; i < requiredValues.length; i++) {
              this.addCustomValue(params.value[i])
          }

        } else {
          select(this.element.querySelector('#values-container')).style.display = 'none'
        }

      } else {
          this.disableButton()
          select(this.element.querySelector('#values-container')).node().style.display = 'none' 
          select(this.element.querySelector('#period_form')).node().style.display = 'none';
          select(this.element.querySelector('#lab1_form')).node().style.display = 'none';
          select(this.element.querySelector('#lab2_form')).node().style.display = 'none';
          select(this.element.querySelector('#country_form')).node().style.display = 'none';

      }
    }

    addCustomValue(value) {
      let container = this.element.querySelector('#values-container')

      const row = document.createElement('tr')
      
      row.innerHTML = `<input type="text" class='custom_value' name='custom_value' style="width: ${this.width * .9 + "px"}" value="${value}" />`
      
      container.appendChild(row)
    }
  

  /**
   * Event function when change the endpoint from the endpoints list input
   * After change endpoint, the list of predefined query will be update follow the selected endpoint
   */
  changeEndpoint(event, value) {



      let querySelector = select(this.element.querySelector("#form_query"))

      querySelector.property('disabled', false)
        .selectAll('option').remove()

      let queries = state.queriesList.filter(d => d.endpoint === value)
      queries.sort( (a,b) => a.name.localeCompare(b.name))


      querySelector.selectAll('option')
        .data(queries)
        .enter()
            .append('option')
            .attr('value', d => d.id)
            .text((d, i) => { return d.name} )

      if (!this.cloneStatus.isFirstTime){
        querySelector.append('option')
          .attr('value', "")
          .attr("disabled", true)
          .attr("hidden", true)
          .attr("selected", true)
          .text("Select a query")
      }
      
      select(this.element.querySelector('#select_query_type')).selectAll('option').remove()
      
      if (!this.cloneStatus.isFirstTime)
        (this.element.querySelector('#form_query') as HTMLInputElement).dispatchEvent(new Event('change'));
  }

  changeQuery() {
    let sel = select(this.element.querySelector('#form_query')).node()
    let value = sel.options[sel.selectedIndex].value
    this.query = value.length ?  state.queriesList.find(x => String(x.id) == value) : null;
    this.displayQuery(this.query)
  }

  changeDataset(){
    let value = select(this.element.querySelector('#form_datasets')).node().value
    this.query = select(this.element.querySelector("#list_datasets")).selectAll('option').filter(function() { return this.text === value }).datum()
    this.enableButton();
  }

  /**
   * Import list input of laboratory fields by laboratories data from defined input params.
   */
  initLabList(){
    if (!state.globalParams) return;
    
    select(this.element.querySelector('#input_lab1'))
    .selectAll('option')
    .data(state.globalParams.laboratories)
    .enter()
        .append('option')
        .attr('value', d => d.name)
        .text(d => d.name + "(" + d.source + ")");

    select(this.element.querySelector('#input_lab1'))
      .append('option')
      .attr('value', '')
      .attr("disabled", true)
      .attr("hidden", true)
      .attr("selected", true)
      .text("Select an institution");


    select(this.element.querySelector("#input_lab2"))
    .selectAll('option')
    .data(state.globalParams.laboratories)
    .enter()
        .append('option')
        .attr('value', d => d.name)
        .text(d => d.name + "(" + d.source + ")");

    select(this.element.querySelector('#input_lab2'))
      .append('option')
      .attr('value', '')
      .attr("disabled", true)
      .attr("hidden", true)
      .attr("selected", true)
      .text("Select an institution")
  }

  /**
   * Import list input of country field by countries data from defined input params. 
   */
  initCountryList(){
    if (!state.globalParams) return;
    
    select(this.element.querySelector('#input_country'))
    .selectAll('option')
    .data(state.globalParams.countries)
    .enter()
        .append('option')
        .attr('value', d => d.name)
        .text(d => d.name);

    // Add disabled option to endpoint input
    select(this.element.querySelector('#input_country'))
      .append('option')
      .attr('value', '')
      .attr("disabled", true)
      .attr("hidden", true)
      .attr("selected", true)
      .text("Select a country");

  }

  defaultOption(id, text) {
    select(this.element.querySelector(id))
      .append('option')
      .attr('value', "")
      .attr("disabled", true)
      .attr("hidden", true)
      .attr("selected", true)
      .text(text)
  }

  /**
   * Import list input of endpoint field by Endpoints data from defined input params that set in the begin 
   */
  initEndpointsList(){
    if (!state.queriesList) return;

    let endpoints = state.queriesList.map(d => d.endpoint) 
    endpoints = endpoints.filter((d,i) => endpoints.indexOf(d) === i)

    select(this.element.querySelector('#list_endpoints'))
    .selectAll('option')
    .data(endpoints)
    .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d)

    let globalThis = this;
    
    // Set onchange event to endpoint input
    select(this.element.querySelector('#form_sparqlEndpoint'))
      .on("change", function(event) { globalThis.changeEndpoint(event, this.value)})

  }

  // TODO: review this when a visual mapping is available
  initVisList() {
    select(this.element.querySelector('#vis_query'))
      .selectAll('option')
      .data(Object.keys(state.views).filter(d => !['query', 'history', 'annotation'].includes(d) ).map(key => state.views[key].title()))
      .enter()
          .append('option')
          .attr('value', d => d)
          .text(d => d)
  }

  async initDatasetsList() {

    if (!state.filenames) return

    select(this.element.querySelector("#list_datasets"))
      .selectAll('option')
      .data(state.filenames)
      .enter()
      .append('option')
      .text(d => {
        let value = d.filename.split('.')[0].replace(new RegExp(d.idHal, "g"), '').replace(/-/g, ' ')
        value.charAt(0).toUpperCase() + value.slice(1);
        return d.name + ': ' + value;
      })

    select(this.element.querySelector("#form_datasets"))
      .on("change", () => this.changeDataset())
  }

  /**
   * Update list input of period field
   */
  initPeriodList(){
    const currentYear = new Date().getFullYear()
    const data =  range(currentYear, 1900, -1)
    
    selectAll(this.element.querySelectorAll('.time-select'))
        .selectAll('option')
        .data(data)
        .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d)
            .property('selected', d => d === currentYear)
  }

  setDatalistInteraction(id) {
    select(this.element.querySelector(id))
      .on('click', function() {
        select(this).attr('placeholder', this.value)
        this.value = '';
      })
      .on('mouseleave', function() {
        if (!this.value.length) {
          this.value = this.placeholder;
        }
      })
  }

  /**
    * This function will disable all of input fields after clicking run button
    * 
  */
  blockContent(){
    select(this.element.querySelector("#run")).node().style.display = "none";
    select(this.element.querySelector("#clear-cache")).node().style.display = "none";
    select(this.element.querySelector("#clone")).node().style.display = "inline-block";
    selectAll(this.element.querySelectorAll("input")).attr("readonly", true);
    selectAll(this.element.querySelectorAll("select")).attr("disabled", true);
  }

  /**
    * This function to disable Run and clone button after get result from server
    * 
  */
  disableButton(){
    select(this.element.querySelector("#run")).attr('disabled', true);
    select(this.element.querySelector("#clear-cache")).attr('disabled', true);
    
  }

  /**
    * This function to enable Run and clone button
    * 
  */
  enableButton(){
    select(this.element.querySelector("#run")).attr('disabled', null);
    select(this.element.querySelector("#clear-cache")).attr('disabled', null);
  }

  showLoading(){
    select(this.element.querySelector('.loading')).node().style.display = "inline-block"
  }

  hideLoading(){
    select(this.element.querySelector('.loading')).node().style.display = "none"
  }

  /**
   * An offline version was created to visualize data that do not come from a SPARQL endpoint
   * For now, it is applied to HAL data, which was used in the HCERES evaluation 2023
   * to-do: generalize this functionality to use with any kind of data
   */
  async setOfflineMode() {
      select(this.element.querySelector("#filename")).style('display', 'block')
      select(this.element.querySelector("#sparql_endpoint")).style('display', 'none')
      select(this.element.querySelector("#sparql_query")).style('display', 'none')
  }

  /**
    * Build function to the form for interacting on the form
    * 
  */
  buildForm(){

    if (state._static) this.setOfflineMode()

    this._view = this._dashboard.shadowRoot.querySelector("[id-view='" + this.element.id + "']")
    select(this.element.querySelector("#clone")).on("click", () => this.cloneQuery() )

    select(this.element.querySelector("#clear-cache")).on("click", () => clearQueryCache(this.form, this.query) )

    select(this.element.querySelector("#run")).on("click", async () => {
      this.disableButton();
      this.showLoading();

      if (this.isInitial){
          let chartElements = this._dashboard.shadowRoot.querySelectorAll("[id-view^='chart']")
          if (chartElements.length > 2) {
            if (confirm('This action will delete all views. Are you sure you want to proceed?')) {
              this._dashboard.resetDashboard();
            }
          }
          
      }
      
      state.indexQueryData = Object.keys(state._data).length

      if (state._static) {
        state._data[state.getDataKey()] =  await requestFile(this.query)
      } else {
        
        state._queries[state.getDataKey()] = this.query
      
        let data = await processQuery(this.query, this.form) // execute the query and transform the results into the MGE format

        
        state._data[state.getDataKey()] = data.mge || data
        let stylesheetActive = (this.element.querySelector('#input_stylesheet') as HTMLInputElement).checked
        
        state._stylesheet[state.getDataKey()] = stylesheetActive ? data.stylesheet : null
      }
      this.displayGraphics()  
    })
  }

  @Method()
  async displayGraphics(){
    let key = state.getDataKey()
    let data = state._data[key]
   
    this.enableButton()
    this.hideLoading()

    if (data && data.message) { 
      alert(data.response || data.message)
      return
    }
    
    await this._view.setDatasetName(key)
    await this._view._showChart(data, this.element.id, 'mge-nodelink', false, null, false, false)

   
    if (!this.isInitial)
        this.blockContent()
   
  }

  componentDidLoad(){
      select(this.element.querySelectorAll(".query")[0])
                .style("width", this.width + "px")
                .style("height", this.height + "px")
                .style("overflow", "auto")

      this.form = this.element.querySelector("#query_form");
      this.defaultOption('#form_query', 'Select a query')
      this.setDatalistInteraction('#form_sparqlEndpoint')
      this.setDatalistInteraction("#form_datasets")

      this.initPeriodList();
      this.initLabList();
      this.initCountryList();
      this.initEndpointsList();

      this.initDatasetsList();
      this.buildForm();
  }

  render() {
    return (
      <Host>
        <div class="query">
        <form name='query_form' id='query_form' class="content" style={{width: this.width + 'px', height: "85%", overflow: "scroll"}}>
            <section id='query_parameters'>
            <table class="form_section table" id='query-head'>
                <tr id="sparql_endpoint"  >
                    <td style={{width: "25%"}}>SPARQL Endpoint</td>
                    <td>
                        <input class="table_cell" id="form_sparqlEndpoint" list="list_endpoints" name="query_endpoint" style={{width: this.width * 0.65 + "px", "margin-left": "5px"}} placeholder="Select a SPARQL Endpoint"></input>
                        <datalist id="list_endpoints"></datalist> 
                  
                    </td>
                </tr>
                <tr id="sparql_query">
                    <td style={{width: "25%"}}>Query</td>
                    <td >
                        <select class="table_cell" id="form_query" name="query_list" disabled 
                          style={{width: this.width * 0.65 + "px"}} 
                          onChange={(event) => this.changeQuery()} />
                    </td>
                </tr>

                <tr id="filename" style={{display: "none"}}>
                    <td style={{width: "25%"}}>Dataset</td>
                    <td >
                        <input class="table_cell" id="form_datasets" list="list_datasets" name="datasets" 
                        style={{width: this.width * 0.65 + "px", "margin-left": "5px"}} placeholder="Select a Dataset"></input>
                        <datalist id="list_datasets"></datalist> 
                    </td>
                    
                </tr>
                <hr style={{width: this.width * .9 + "px"}}></hr>

                

                <div id='period_form' style={{"display":"none"}}>
                    <tr><td colSpan={4}>Time Period</td></tr>
                    <tr>
                      <td>From</td>
                      <td><select id='select_from_year' class="time-select" name='from_year'></select></td>
                    
                      <td>To</td>
                      <td><select id='select_to_year' class="time-select" name='to_year'></select></td>
                    </tr>
          
                </div>
                

                <tr id='lab1_form' style={{"display":"none"}}>
                    <td style={{width: "25%"}} id='lab1_title'>Institutions</td><td>
                        <select id='input_lab1' name='query_lab1' style={{width: this.width * 0.65 + "px"}}/>
                        <datalist id='select_laboratory1'></datalist>
                    </td>
                </tr>
                <tr id='lab2_form' style={{"display":"none"}}>
                    <td style={{width: "25%"}}></td>
                    <td>
                        <select id='input_lab2' name='query_lab2' style={{width: this.width * 0.65 + "px"}}/>
                        <datalist id='select_laboratory2'></datalist>
                    </td>
                </tr>
                

                <tr id='country_form' style={{"display":"none"}}>
                    <td style={{width: "25%"}}>Country </td><td>
                        <select id='input_country' name='query_country' style={{width: this.width * 0.65 + "px"}}/>
                    </td>
                </tr>

                

                <div id="values-container" style={{display: "none"}}>
                  <tr>Values</tr>
                </div>

                
                <tr id='stylesheet_form' style={{"display":"none"}}>
                  <td>Stylesheet</td>
                  <input type='checkbox' id='input_stylesheet' name='check_stylesheet'></input>
                  <textarea id='value_stylesheet' name='stylesheet_content' style={{"display":"none"}}></textarea>
                </tr>

                {/* <tr> // to-do: include it when the visual mapping is ready
                    <td > Visualization technique * </td>
                    <td >
                        <select class="table_cell" id="vis_query" name="vis_list" style={{width: this.width * 0.65 + "px"}} />
                    </td>
                </tr> */}
            </table>
        </section>
            <section class="form_section" >
                <textarea id="form_sparqlQuery"  rows={30} cols={120} name="query_content"
                    style={{"display":"none"}} >         
                </textarea>
            </section>
        </form>
        <div style={{"position":"absolute", "bottom":"10px", "width": "100%"}}>
                <table class='query_buttons' style={{"width": "100%"}}>
                    <tr style={{"width": "100%", "text-align":"right"}}>
                        <td>
                        <img src={getAssetPath("assets/images/loading.svg")} class="loading" width={30} height={30} style={{display: "none"}}></img>
                        <button type='button' class="btn btn-outline-secondary" id='clone' style={{"display":"none"}}>Clone</button>
                        <button type='button' class="btn btn-outline-secondary" id='clear-cache' disabled>Clear cache</button>
                        <button type='button' class="btn btn-outline-primary" id='run' disabled>Run</button>
                        </td>

                    </tr>
                </table>
            </div>
        </div>
      </Host>
    );
  }

}