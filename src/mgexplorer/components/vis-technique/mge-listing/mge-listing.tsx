import { Component, Element, Host, Prop, h, Event, EventEmitter, Method, getAssetPath } from '@stencil/core';
// import { allPapersList, duoPapersList, clusterPapersList } from './process-data'
import Model from 'model-js';
import { sum, ascending, zoom } from 'd3'
import { select } from 'd3-selection'
import state from "../../../store"

import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10  } from 'd3-scale-chromatic'

import { subGraph } from '../../../../lib/mge-mappers'

@Component({
    tag: 'mge-listing',
    styleUrl: 'mge-listing.css',
    shadow: false,
    assetsDirs: ['assets']
})
export class MgeListing {

    @Element() element: HTMLElement;
    /** represents the width of the paper's list chart*/
    @Prop() width: number = 350;
    /** represents the height of the paper's list chart*/
    @Prop() height: number = 350;
    /** The dataset name being used */
    @Prop() datasetName: string = "[]";

    public chartData: any;
    public model: any;
    public _chart: any;
    private _dashboard;
    private _view;
    private _subGraph: any;
    private _helpTooltip = null;
    private _itemTypes = null;

    public selectedobj = {
        "view": "listing",
        "authors": [],
        "date": "",
        "title": "",
        "link": "",
        "type": ""

    };

    /** represents the panel associated with the graph*/
    @Prop({ mutable: true }) _papersListPanel = null;  // represents the panel associated with the graph
    private _sortByText = true;
    /** Group representing IRIS*/
    @Prop({ mutable: true }) _grpPapersList = null;   // Group representing IRIS 
    /** Selection that contains all groups of bars*/
    @Prop({ mutable: true }) _grpPapers = null;       // Selection that contains all groups of bars
    /** Selection that contains the names of the members of a cluster*/
    @Prop({ mutable: true }) _names = null;          // Selection that contains the names of the members of a cluster
    /** Maximum length of title*/
    @Prop({ mutable: true }) _maxLenghtTitleIndex = 7.8;
    /** Maximum length of names*/
    @Prop({ mutable: true }) _maxNamesLenght = 87;
    /** List of items in the data*/
    @Prop({ mutable: true }) _data = null;

    /** Colors for the different types*/
    @Prop({ mutable: true }) _colorsRect;     // colors for the different types


    constructor() {
        this.model = Model();
        this._dashboard = document.querySelector("mge-dashboard");

        this._subGraph = subGraph()

        this._colorsRect = scaleOrdinal(schemeCategory10).domain([0,1,2,3]);
    }

    //---------------------

    /**
    * Set box size for the chart includes the content
    * input is a object includes height and width
    * If no arguments, It will return the value of box
    */
    @Method()
    async setBox(_) {
        if (!arguments.length)
            return this.model.box;
        this.model.box = _;

    };

    //---------------------
    @Method()
    async dataVisToNode(index) {
        return this.model.data.children.data[index];
    };

    //---------------------
    /** This function is to set the data to the listing papers chart
      * If no arguments, It will return the value of data
      */
    @Method()
    async setData(_, datasetName, secondNode, source, parentNode) {
        if (!arguments.length)
            return this.model.data;

        
        if (secondNode || source === 'IC-bars') {
            this.model.data = this._subGraph.duoPapersList(_, secondNode, state._data[datasetName]);
        } else if (source === 'mge-clustervis') {
            this.model.data = this._subGraph.clusterPapersList(_, state._data[datasetName]);
        } else if (source === 'mge-barchart') {
        
            let parentNodeData = await parentNode.setData()
            let firstNode = parentNodeData.root.data
        
            if (parentNodeData.secondNode)
                this.model.data = this._subGraph.duoPapersList(firstNode, parentNodeData.secondNode, state._data[datasetName])
            else 
                this.model.data = this._subGraph.allPapersList(firstNode, state._data[datasetName]);
            
            // filter documents to keep only data for the selected type and date
            this.model.data.root.data.documents = this.model.data.root.data.documents.filter(d => d.date === _.date && d.type.index === _.index )
            
        } else {
            this.model.data = this._subGraph.allPapersList(_, state._data[datasetName]);
        }

        this._itemTypes = this.model.data.root.data.documents.map(d => d.type)
        this._itemTypes = this._itemTypes.filter( (d,i) => this._itemTypes.findIndex(e => e.index === d.index) === i)

        this._view.height = this.model.box.height;
    };


    sortByText() {
        this._sortByText = false;
        this._data.root.data.documents.sort(function (x, y) {
            return ascending(x.title, y.title);
        });
        this.model.redraw += 1;
    };

    //---------------------
    sortByYear() {
        this._sortByText = false;
        this._data.root.data.documents.sort(function (x, y) {
            return ascending(x.date, y.date);
        });
        this.model.redraw += 1;
    };


    sortByType = function () {
        this._sortByText = false;
        this._data.root.data.documents.sort(function (x, y) {
            return x.type.label.localeCompare(y.type.label)
        })
        this.model.redraw += 1;
    };

    @Event({ bubbles: true, composed: true }) testevent: EventEmitter;
    _onMouseClick(type, data) {
        Object.entries(state.annotations).forEach(([key, value]) => {
            if (value["disabled"] == false) {
                if (value["data"] == "" || value["data"].view != "listing") {
                    value["data"] = {
                        "view": "listing",
                        "date":"",
                        "title":"",
                        "link":"",
                        "type":"",
                        "authors": []
                    };
                }

                    value["data"].title = data.title;
                    value["data"].date= data.date;
                    value["data"].link= data.link;
                    value["data"].type =data.type.label;
                    value["data"].authors = data.authorList.split(",");
                state.annotations[key] = value;

            }
        });
        this.testevent.emit(state.annotations);
        this._send_id(this.element.id);
    }


    @Event({ bubbles: true, composed: true }) idevent: EventEmitter;
    _send_id(id) {
        this.idevent.emit(id)
    }

    addPaperListChart(divTag) {

        this.model.margin = { top: 2, right: 2, bottom: 2, left: 2 };
        this.model.box = { width: this.width, height: this.height };
        this.model.pInnerRadius = 0.13;    // Percentage relative to graph width for _innerRadius calculation
        this.model.pOuterRadius = 0.57;    // Percentage relative to graph width for _OuterRadius calculation
        this.model.pMaxHeightBar = 0.15;  // Percentage relative to graph width for _MaxHeightBar calculation
        this.model.pFocusWidthBar = 0.0275;  // Percentage relative to graph width for calculation of _focusArea.widthBar
        this.model.pMinWidthBar = 0.01;       // Percentage relative to graph width for calculation of _minArea.widthBar Original 4

        this.model.indexAttBar = 0;           // Index of the attribute that will be plotted in the toolbar

        this.model.redraw = 0;

        // ---------------- Initialization Actions
        let _svg = divTag.append("svg"),  // Create dimensionless svg
            _grpChart = _svg.append("g");

        _svg.attr("class", "PaperListView");
        this._grpPapersList = _grpChart.append("g").attr("class", "PapersListChart");

        let _helpContainer = divTag.append("div")
            .attr("class", "helpContainer")
            .on("mouseover", this._openToolTip.bind(this))
            .on("mouseout", this._closeToolTip.bind(this));

        _helpContainer.append("img")
            .attr('src', getAssetPath('assets/images/palette.svg'))
            .attr('width', 15)
            .attr('height', 15)

        this._helpTooltip = divTag.append("div")
            .attr("class", "helpTooltip")
            .style("display", "none");

        this._helpTooltip.append("svg")
            .attr("class", "HC-legend")
            .attr("y", 1)
            .attr("dy", ".71em")

        //===================================================
        this.model.when(["box", "margin"], (box, margin) => {
            this.model.widthChart = box.width - margin.left - margin.right;
            this.model.heightChart = box.height - margin.top - margin.bottom;
        });

        this.model.when("box", (box) => {
            _svg.attr("width", box.width).attr("height", box.height);
            select(this.element.querySelectorAll(".paper-list")[0]).style("width", box.width + "px").style("height", box.height + "px")
            select(this.element).attr("height", box.height).attr("width", box.width)
        });

        //---------------------
        this.model.when("margin", function (margin) {
            _grpChart.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        });



        //---------------------
        this.model.when(["data", "widthChart", "heightChart", "redraw"],
            () => {
                if (this._grpPapers !== null)
                    this._grpPapers.remove();
                this._data = this.model.data;

                if (this._sortByText)
                    this.sortByText();

                let endOfNames = 0;

                if (this.model.data.root.data.documents.length * 38 >= 350) {
                    _svg.attr("height", this.model.data.root.data.documents.length * 38);
                }

                if (this.model.data.children.cluster === true) {
                    if (this._names !== null)
                        this._names.remove();

                    let authors = []
                    this.model.data.children.data.forEach(d => {
                        authors.push(d.labels[1])
                    })

                    // Cluster term
                    this._grpPapersList.append("text")
                        .attr("class", "PL-names")
                        .text("Cluster: ")
                        .attr("x", 10)
                        .attr("y", 12)
                        .style("font-size", "12px")
                        .append("title")
                        .text("Cluster: " + authors.join(','));

                    let y = 12;
                    this._names = this._grpPapersList.selectAll(".PL-grpNames")
                        .data(authors)
                        .enter()
                        .append("text")
                        .attr("class", "PL-names")
                        .attr('transform', (d, i) => `translate(55, ${y + i * 12})`)
                        .style("font-size", "12px")
                        .text(d => d)

                    endOfNames = authors.length * 12 + y;
                }


                let x = 5, y = (this.model.data.children.cluster === true ? endOfNames + 15 : 15);

                this._grpPapers = this._grpPapersList.selectAll(".PL-grpPapers")
                    .data(this.model.data.root.data.documents)
                    .enter()
                    .append("g")
                    .attr("class", "PL-grpPapers")
                    .attr('transform', (_, i) => `translate(${x}, ${y + 35 * i})`)

                this._grpPapers.append("rect")
                    .attr("class", "PL-type")
                    .attr("height", 10)
                    .attr("width", 10)
                    .attr("fill", d => this._colorsRect(d.type.index))
                    .on("click", (d, f) => { this._onMouseClick(d,f) })
                    .append("title")
                    .text(d => d.type.label);


                let maxLenghtTitle = this.model.widthChart;

                x = 15;
                this._grpPapers.append('a')
                    .attr("xlink:href", function (d) { return d.link })
                    .attr("target", "_blank")
                    .classed('PL-icon', true)
                    .append("image")
                    .attr('xlink:href', getAssetPath(`./assets/images/external-link.svg`) )
                    .attr('width', 12)
                    .attr('height', 12)
                    .attr('transform', `translate(${x}, ${-2})`)

                x = 35;
                this._grpPapers.append("text")
                    .attr("class", "PL-title")
                    .text(d => d.date ? '(' + d.date + ') ' + d.title : d.title)
                    .attr("x", x)
                    .style("font-size", "12px")
                    .append("title")
                    .text(function (d) { return d.title })


                let infoText = this._grpPapers.selectAll('text.PL-infos')
                    .data(d => d.authorList.length ? d.authorList : d.authors)
                    .enter()
                    .append('text')
                    .attr("class", "PL-infos")
                    .text(function(d,i) {
                        let parent = select(this.parentNode).datum()
                        let values = parent.authorList.length ? parent.authorList : parent.authors;
                        return d.label + ( i === values.length - 1 ? '' : ', ')
                    })
                    .style("font-size", "12px")
                    .call(e => e.attr('transform', function(d,i) {
                        let textlength = 0;
                        let sibling = this.previousSibling;
                        while (sibling && sibling.className.baseVal === 'PL-infos') {
                            textlength += sibling.getComputedTextLength();
                            sibling = sibling.previousSibling;
                        }

                        if (maxLenghtTitle < textlength) {
                            maxLenghtTitle = textlength
                        }
            
                        return `translate(${x + textlength }, 15)`
                    }) )
                
                infoText.append("title")
                    .text(d => d.label)

                this._grpPapers.selectAll('text.PL_title')
                    .each(function () {
                        let textlength = this.getComputedTextLength();
                        if (textlength > maxLenghtTitle) maxLenghtTitle = textlength;
                    })
                _svg.attr("width", maxLenghtTitle + 100);

                this._setLegend()
            
            } // End
        );
    }

    //--------------------------------- Private functions


    _setLegend() {

        let legendSvg = this._helpTooltip.select("svg")

        let legendGrp = legendSvg.selectAll('g')
            .data(this._itemTypes)
            .enter()
                .append('g')

        legendGrp.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", d => this._colorsRect(d.index))
            .attr("transform", (_,i) => "translate(10," + `${20 * i + 10}` + ")");

        legendGrp.append("text")
            .attr("transform", (_,i) => "translate(30," + `${20 * i + 10}` + ")")
            .attr("y", "10")
            .text(d => d.label || "No description provided")
    }

    _openToolTip(){
        this._helpTooltip.style("display", "block");
    }
    
    _closeToolTip(){
        this._helpTooltip.style("display", "none");
    
    }

    buildChart(div) {

        this.addPaperListChart(div);
    }


    componentDidLoad() {
        this._view = this._dashboard.shadowRoot.querySelector("[id-view='" + this.element.id + "']");
        let div = select(this.element.querySelectorAll(".paper-list")[0])
            .style("width", this.width + "px")
            .style("height", this.height + "px");
        this.buildChart(div);
    }

    render() {
        return (

            <Host>
                <div class="paper-list" />
            </Host>

        )
    }
}

