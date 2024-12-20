import { createStore } from "@stencil/store";


const { state } = createStore({
	hasImportData: false,
	indexChart: 0,
	indexQueryData:0,
	zIndex: 0,
	
	ATN_ShortName: 0,   // ATN: Node attribute
	ATN_AuthorName: 1,
	ATN_Category: 2,
	ATN_LinhaPesq: 3,
	ATN_Area: 4,

	ATN_QtLinhaPesq: 1001,

	ATN_QtPublicacoes: 1000, // 1st type (indices of the "values" array)
	ATN_QtJournals: 1001, // 2nd type
	ATN_QtBooks: 1002, // 3rd type
	ATN_QtProceedings: 1003, // 4th type

	ATN_ConnectComp: 1007,

	ATN_Degree: 1011,
	ATN_qtItems: 7,
	ATN_qtNodes: 8,

	ATE_QtPublicacoes: 1000,   // ATE: Attribute edge
	ATE_QtJournals: 1001,
	ATE_QtBooks: 1002,
	ATE_QtProceedings: 1003,
	ATE_Category: 1005,

	TC_NodeEdge: 0,   // Technique
	TC_ClusterVis: 1,
	TC_Iris: 2,
	TC_GlyphMatrix: 3,
	TC_Iris_Solo: 4,
	TC_PapersList_Solo: 5,
	TC_NodeEdge_HAL: 6,
	TC_ClusterVis_HAL: 7,
	TC_Histogram: 8,

	MG_WidthChart: 350,
	MG_HeightChart: 350,
	headerTitle: " connections ",
	headerParameter: "  ",

	_historydata:[],
	_annotationdata: [],
	_querydata: [],

	indexAnnotation:1,
	objectview:"",

	formData: {},
	savedData: {},
	selectedViews:[],

	GLYPH_STAR:4,
	_data: {},
	_queries: {},
	_stylesheet: {},

	globalParams: null,
	queriesList: null,
	filenames: null,
	routes: null,
	urlQuery: null,
	data: null,
	views: {
		"mge-nodelink": { 
			// component: "mge-nodelink", 
			title: () => 'Graph view', 
			enabled: true, 
			contextmenu: ['mge-clustervis', 'mge-iris', 'mge-glyph-matrix', 'mge-barchart', 'mge-listing', 'mge-query'] 
		},
		"mge-barchart": { 
			// component: "mge-barchart", 
			title: () => 'Distribution view', 
			enabled: true,
			contextmenu: ['mge-listing', 'mge-query']  
		},
		"mge-clustervis": {
			// component: "mge-clustervis", 
			title: () => 'Cluster view', 
			enabled: true,
			contextmenu: ['mge-clustervis', 'mge-iris', 'mge-glyph-matrix', 'mge-barchart', 'mge-listing', 'mge-query']  
		},
		"mge-glyph-matrix": {
			// component: "mge-glyph-matrix", 
			title: () => 'Pairwise relationship view', 
			enabled: true,
			contextmenu: ['mge-clustervis', 'mge-iris', 'mge-glyph-matrix', 'mge-barchart', 'mge-listing', 'mge-query']  
		},
		"mge-iris": { 
			// component: "mge-iris", 
			title: () => 'Egocentric view', 
			enabled: true,
			contextmenu: ['mge-barchart', 'mge-listing', 'mge-query']   
		},
		"mge-listing": {
			// component: "mge-listing", 
			title: () => 'Listing view', 
			enabled: true,
			contextmenu: ['mge-query']  
		 },
		"mge-query": { 
			// component: "mge-query", 
			title: (d) => d ? d + ' Query' : 'Query', 
			enabled: true
		},
		"mge-history": { 
			// component: "mge-history", 
			title: () => 'Exploration History', 
			enabled: true 
		},
		"mge-annotation": { 
			// component: "mge-annotation", 
			title: () => 'Annotation', 
			enabled: true 
		}
  	},
	_id_parent:null,
	selectedobj: null,
	annotations: {},

	_static: false,
	_cache: true,

	//assetsPath: '/mgexplorer/assets',

	getDataKey: () => `data-${state.indexQueryData}`
});

export default state;