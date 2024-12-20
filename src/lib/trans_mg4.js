/**
 * LinkedDataViz Transformation 
 * Server Side
 * Transform SPARQL Result JSON Format to MGExplorer JSON Format
 *
 * Yun Tian - Olivier Corby - Marco Winckler - 2019-2020
**/

import { sum } from "d3";


let types = {};

const defaultType = "items";
const defaultColor = "steelblue"

const SKIP  = "skip";
const MIX   = "mix";

function isURI(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

function setTypes(values) {
    if (values.length > 4) {
        values.slice(0,3).forEach(d => { 
            let key = getTypeLabel(d)
            if (Object.keys(types).includes(key))
                types[key].push(d)
            else types[key] = [d];
        })
        types['Other'] = values.slice(3, values.length)
    } else if (values.length > 0) {
        values.forEach(d => { 
            let key = getTypeLabel(d)
            if (Object.keys(types).includes(key))
                types[key].push(d)
            else types[key] = [d];
        })
    } else {
        types[defaultType.charAt(0).toUpperCase() + defaultType.slice(1)] = [defaultType];
    }

    const nbKeys = Object.keys(types).length;
    for (let i = 0; i < 4 - nbKeys; i++) { // complete with "garbage" if less than 4 types
        types['z'+i] = [];
    }

    function getTypeLabel(label){
        return isURI(label) ? label.split('/').pop() : label.charAt(0).toUpperCase() + label.slice(1);
    }
}

function getTypeLabels() {
    return Object.keys(types);
}
    
// Transformer l'uri de type vers une chaîne de caractère simple
function transformType(type) {
    let newType = null;
    Object.keys(types).forEach(key => {
        if (types[key].includes(type)) 
            newType = key;
    })
    return newType || 'Unknown';
}

// prendre le nom complète d'un auteur et donner son nom abbrégé (par ex. getShortName("Yun Tian") = "Y. Tian" )
// à optimiser : getShortName("Catherine Faron Zucker") donne "C. Zucker" mais "C. Faron Zucker" est attendu
function getShortName(fullname) {
    var words = fullname.split(" ");
    var firstname = words[0];
    var lastname = words[words.length - 1];
    var shortname = firstname[0] + ". " + lastname;
    return shortname;
}

// map:  type -> index of type in typecount = createTypeIndex(types)
// typecount: array of counter for each document type
async function findQtTypeCo(data, authorname, coauthorname, typecount) {
    let res = data.filter(d => {
        if (d.author) {
            let authors = d.author.value.split('--') // retrieve list of authors
            return authors.includes(authorname) && authors.includes(coauthorname)
        } else return (d.s.value === authorname && d.o.value === coauthorname) || (d.s.value === coauthorname && d.o.value === authorname)
    })
    res = res.filter( (d,i) => res.findIndex(e => e.p.value === d.p.value) === i)
    
    res.forEach(d => {
        let index = Object.keys(types).indexOf(transformType(d.type.value))
        typecount[index]++
    })
}

// Transformer le format spéciale d'une date vers l'année en 4 chiffres ($return string)
function transformDate(dateuri) {
    dateuri = String(dateuri);
    dateuri = dateuri.replace('\"', "");
    return dateuri.substr(0, 4);
}

// Fonction développée pour visualiser les données demandées par la technique "Papers' List"
// data : résultat SPARQL
// nodes : objet créé pendant la transformation
// $return : un Array dont chaque élément (objet) représente un document avec toutes ses informations

function getDocumentInformation(data, authorIdMap) {
    var docMap = new Map();
    
    data.forEach(elem => {
        var dc = elem.p.value;  
        
        // modify tp to be an object with the index and name of the type (allowing for coherence among views)
        // then modify the access on the paper list and histogram charts
        if (! docMap.has(dc) ) {        
            let docType = transformType(elem.type.value)
            docMap.set(dc, {
                "type": {'label': docType, 'index': Object.keys(types).indexOf(docType)}, 
                "date": elem.date ? transformDate(elem.date.value) : null, 
                "title": elem.label ? elem.label.value : elem.p.value,
                "authors": elem.author ? elem.author.value.split('--') : [], // if there is a list of authors, use it, otherwise fill out later with ?s and ?o info
                "link": elem.url ? elem.url.value : "#",
                "pmid": elem.pmid ? elem.pmid.value : null,
                "authorList": elem.authorList ? elem.authorList.value.split('--').map(d => { return {label: d} }) : []
            })
        }

        var doc = docMap.get(dc);
        if (elem.s && elem.s.value.length && !doc.authors.includes(elem.s.value)) 
                doc.authors.push(elem.s.value)

        if (elem.o && elem.o.value.length && !doc.authors.includes(elem.o.value) ) 
                doc.authors.push(elem.o.value)
    })

    let docList = Array.from(docMap.values())
    docList.forEach(doc => {
        doc.authors = doc.authors.map( d => ({ label: d, id: authorIdMap.get(d) }))
    })

    return docList
}

// Filtrer les résultats SPARQL dont le type du document ne correspond pas aux 4 types choisis
function deleteIrrelevantTypes(data) {
    data = data.filter(function (item) {
        complete(item);
        var tp = item.type ? item.type.value : null;
        var bb = Object.values(types).some(d => d.includes(tp));

        var ok = item.author || (item.s && item.o && item.s.value != "" && item.o.value != "");
        
        return ok && bb;
    });
    return data;
}

function complete(item) {
    if (item.type == null) {
        item.type = {"value": defaultType};
    }
}

// add a2 in a1 coauthor set
function addCoauthor(map, a1, a2) {
    if (! map.has(a1)) {
        map.set(a1, new Set());
    }
    var aset = map.get(a1);
    aset.add(a2);
}

/**
 * sparql result elem may contain styles for nodes with variable ?style and ?mix
 * styleMap :  author -> style
 * variable ?mix when it exists is the style to assign to a node having two different styles
 */
function defStyle(stylesheet, styleMap, a1, a2, elem) {
    var mix = null;
    if (elem.mix) {
        mix = elem.mix.value;
    }

    if (elem.style1) {
        addStyle(stylesheet, styleMap, a1, elem.style1.value, mix);    
    }

    if (elem.style2) {
        addStyle(stylesheet, styleMap, a2, elem.style2.value, mix);    
    }

    if (elem.style) {
        addStyle(stylesheet, styleMap, a1, elem.style.value, mix);    
        addStyle(stylesheet, styleMap, a2, elem.style.value, mix);    
    } 
}

/**
 * name is either the name of a style in the stylesheet of the name of a color
 */
// function getStyle(stylesheet, colorname) {
//     return stylesheet.node && stylesheet.node[colorname] ? stylesheet.node[colorname] : colorname;
// } 

/**
 * Assign a style to author node in the style map
 * mixvar is a backup style in case node already has a style, comes from ?mix variable
 */
function addStyle(stylesheet, map, node, style, mixStyle) {
    if (style === SKIP) return // do nothing yet, style may be set by another result
    
    if (map.has(node)) {
        // node already has style
        var oldStyle = map.get(node);
        if (oldStyle != style) { // different styles for same node
            if (mixStyle) map.set(node, mixStyle); // set mix style from ?mix variable
            
            
            else if (stylesheet.node && stylesheet.node.mix && stylesheet.node.mix.active ) { // set mix style from stylesheet
                map.set(node, "mix") 
                //getMixValue(stylesheet, map, node, oldStyle, style);
            }
        }
    }
    else {
        map.set(node, style)
    }
}

/**
 * value: current value 
 * style: new value
 */ 
function getMixValue(stylesheet, map, node, oldStyle, style) {
    if (stylesheet.node[oldStyle] && stylesheet.node[oldStyle].priority &&
        stylesheet.node[style] && stylesheet.node[style].priority) {
        
        if (stylesheet.node[oldStyle].priority > stylesheet.node[style].priority) {  // keep style with higher priority
            map.set(node, oldStyle);
        }
    }
    else { // uses the color assigned to MIX in the stylesheet
        map.set(node, "mix");
    }
}

/**
 * Style eventually assigned to mgexplorer author node data structure
 * When there is a stylesheet with default style, return default color
 */
function getFinalStyle(stylesheet, map, node) {
    if (stylesheet.node) {
        if (map.has(node)) 
            // return getStyle(stylesheet, map.get(node));
            return stylesheet.node[map.get(node)]
        return stylesheet.node.default;
    }
    return null;
}

/**
* i = index of type in array of types
* increment the counter of documents of type i for author a
* docMap:  author -> Set of doc
* typeMap: author -> array of number of documents by type
**/
function addType(docMap, typeMap, a, doc, i) {
    if (! docMap.has(a)) {
        docMap.set(a, new Set());
    }

    if (!typeMap.has(a)) {
        var arr = createTypeCounterArray(types);
        typeMap.set(a, arr);
    }

    var docSet = docMap.get(a);
    if (!docSet.has(doc)) {
        docSet.add(doc);
        incrementType(typeMap.get(a), i)
    }
}

function incrementType(typeArray, i) {
    typeArray[i] ++;
}

// create an array of number of documents by type
function createTypeCounterArray(types) {
    return new Array(Object.keys(types).length).fill(0);
}


// document type -> index of doc type
function createTypeIndex(types) {
    let map = new Map();
    Object.keys(types).forEach((d,i) => map.set(d, i));
    return map;
}


/** 
 * Main Fonction  
 * input: whole JSON received by server (contains SPARQL query, type and endpoint)
 * send query to SPARQL endpoint
 * process JSON Transformation
**/
async function transform(data, stylesheet) {
    
    var ti1 = new Date();
    
    types = {}; // reinitialize types

    // select unique values of attribute (variable ?type)
    let typeList = [];
    let typeCount = {};

    if (data.length > 0 && data[0].type) {
        typeList = data.map(d => d.type ? d.type.value : null).filter(d => d)
        typeList.forEach(d => {
            if (Object.keys(typeCount).includes(d)) typeCount[d] ++;
            else typeCount[d] = 1;
        })
        typeList = typeList.filter((d,i) => typeList.indexOf(d) == i)
        typeList.sort((a,b) => typeCount[b] - typeCount[a])
    }

    // set types according to attribute variable (uses only the first 4 elements for now)
    setTypes(typeList)
    data = deleteIrrelevantTypes(data); // Remove data with undefined document type
    // data = prepareResult(data);
    var ti2 = new Date();
    var len = data.length;

    // Créer le corps de l'objet json par rapport au format attendu par MG-Explorer
    // Les données seront remplies dans "dataNodes" et "dataEdges"
    var nodes = nodeFormat();
    var edges = edgeFormat();

    // var not = "Not Informed"; // Remplir aux termes non-obligatoires
    var typeIndex = createTypeIndex(types);
    // author -> style (graph node color style)
    var styleMap = new Map();
    // set of all authors
    var authorSet = new Set();
    // author -> Set(coauthor)
    var authorMap = new Map();
    // author -> Set(document)
    var docMap = new Map();
    // author -> [nb doc type_i]
    var docTypeMap = new Map();
    
    // for each solution
    data.forEach(elem => {
        
        let type = transformType(elem.type.value);
        let p = elem.p.value;

        if (elem.author) {
            let authorList = elem.author.value.split('--') 

            authorList.forEach(a => {
                authorSet.add(a);

                authorList.forEach(a1 => {
                    if (a != a1) 
                        addCoauthor(authorMap, a, a1)
                        if (stylesheet) 
                            defStyle(stylesheet, styleMap, a, a1, elem)
                })

                addType(docMap, docTypeMap, a, p, typeIndex.get(type));
            })
        } else {
            let a1 = elem.s.value;
            let a2 = elem.o.value;
            
            authorSet.add(a1);
            authorSet.add(a2);
            
            // coauthor set
            if (a1 != a2) { 
                // only add co-author if the authors are not the same (as we recover ?s and ?o every time, we can have the same author twice for an article if they have no co-authors)
                addCoauthor(authorMap, a1, a2);
                addCoauthor(authorMap, a2, a1);
            }

            // count doc by type of doc
            addType(docMap, docTypeMap, a1, p, typeIndex.get(type));
            addType(docMap, docTypeMap, a2, p, typeIndex.get(type));
            
            if (stylesheet) defStyle(stylesheet, styleMap, a1, a2, elem)
        }
        
    })

    var id = 0;
    var idMap = new Map();
         
    // generate node data structure
    for (let author of authorSet) {
        let shortName = getShortName(author);
        let coauthorSet = authorMap.get(author);
        let qtCoauthor = coauthorSet ? coauthorSet.size : 0;            
        let qtEachType = docTypeMap.get(author);
        
        let style = stylesheet ? getFinalStyle(stylesheet, styleMap, author) : { color: defaultColor };
       
        idMap.set(author, id);
        let nodeInfo = getNodeInfo(id, shortName, author, qtEachType, qtCoauthor, style);
        nodes.dataNodes.push(nodeInfo);
        id++;

    }
    
    // array of documents: title, uri, authors id array
    let documents = getDocumentInformation(data, idMap); //  documents
    let groupList = []; // contiendra les paires [author, coauthor]

    for (let author of authorSet) {
        let coauthorSet = authorMap.get(author);
        let authorID = idMap.get(author)
        if (coauthorSet && coauthorSet.size) {
            for (var it = coauthorSet.values(), val = null; val = it.next().value; ) {
                let coauthorID = idMap.get(val)
                if ( !groupList.some(d => (d.coauthor.id === coauthorID && d.author.id === authorID) || (d.coauthor.id === authorID && d.author.id === coauthorID)) )
                    groupList.push({
                        author: { name: author, id: authorID },
                        coauthor: { name: val, id: coauthorID }
                    })
            }
        }
    }

    
    // generate edge data structure
    // for each pair of coauthors in groupList
    groupList.forEach(async (pair) => {    
        let countTypeDocs = createTypeCounterArray(types);
        
        await findQtTypeCo(data, pair.author.name, pair.coauthor.name, countTypeDocs) // count of documents per type
        
        let countDocs = countTypeDocs.reduce( (a,b) => a + b) // total count of docs
        var edgeInfo = await getEdgeInfo(pair.author.id, pair.coauthor.id, countTypeDocs, countDocs);    

        edges.dataEdges.push(edgeInfo);
        
    })

    var res2 = getRes(documents, nodes, edges);
    
    var ti3 = new Date();
    var stime = parseInt(ti2 - ti1) / 1000;
    var ttime = parseInt(ti3 - ti2) / 1000;
    var total = parseInt(ti3 - ti1) / 1000;
    
    var res3 = {
        "query_time": stime,
        "trans_time": ttime,
        "total_time": total,
        "res_number": len,
        "node_number": nodes.dataNodes.length,
        "edge_number": edges.dataEdges.length,
        "data_type": 1 //lb
    }
    
    return {
        'mge': res2,
        'stats': res3
    }
    
}

function getRes(items, nodes, edges) {
    return {
        'items': items, 
        "info": {
            "qtNodos": nodes.dataNodes.length,
            "qtArestas": edges.dataEdges.length
        },
        "nodes": nodes,
        "edges": edges
    }
}

/**
* id =  node number associated to author
* shortName, author = names of the author
* qtEachType = array of numbers of documents by type of document
* qtCoauthor = number of all coauthors
* lb =  style data for graph node color
**/
function getNodeInfo(id, shortName, author, qtEachType, qtCoauthor, style) {
    var not = "Not Informed";
    var nodeInfo = {
        "id": id, "idBD": id, "labels": [shortName, author, not, not, not], 
        "values": qtEachType.concat([2004, 0, 0])
            .concat([qtCoauthor, qtCoauthor, 0.1, 0.1, qtCoauthor / 2 + 1]),
        "images": null
    };
    if (style != null) {
        nodeInfo.style = style;
    }
    return nodeInfo;
}

function nodeFormat() {
   var nodes = {
        "labelTitle": ["Short Name", "Author Name", "Category", "Research", "Area"],
        "valueTitle": getTypeLabels().concat(["Year Last Pub", "Qt Research", "Qt Area"])
            .concat(["Connected Comp.", "Edge BetWeenness", "Closeness Centrality",
            "Betweenness Centrality", "Degree"]),
        "imageTitle": null,
        "dataNodes": []
    };
    return nodes;
}

// TODO: translate the valueTitle options to english
function edgeFormat() {
    var edges = {
        "labelTitle": null,
        "valueTitle": getTypeLabels().concat(
            ["Qt_Items", "English", "Portuguese", "Spanish", "German", "French",
            "Research N.I.", "Tolerancia a falhas", "Inteligencia Artificial", "Modelagem Conceitual e BD",
            "Comp. Grafica e P.I.", "Sistemas de Tempo Real", "Arquiteture e Proj. Sist. Comp.", "Microeletronica",
            "Redes de Computadores", "Proc.Paralelo e Distr.", "Metodos formais", "Fundamentos da Computacao", "Engenharia de Software",
            "Sistemas Embarcados", "Teste e Confiabilidade", "TV Digital", "Projeto Isolado",
            "Natureza N.I.", "Trabalho Completo", "Resumo", "Capitulo", "Texto Integral", "Resumo Expandido", "Outro",
            "Area N.I.", "Sistemas de Computacao", "Sistemas de Informacao", "Inteligencia Artificial", "Eng. da Computacao", "Informatica Teorica"]),
        "dataEdges": []
         // "Qt Conference Papers", "Qt Journals", "Qt Books", "Qt Reports",
    };
    return edges;
}


/**
* id1 id2: node numbers of edge nodes
* qtEachTypeCo: array of number of documents by document types, with id1 id2 as coauthors (not sure graphic use it)
* qtPubCo: total number of copublications with id1 id2 as coauthors
* qtEachLanCo:  deprecated number of documents by languages
* documents: array of documents with id1 id2 as coauthors
**/
async function getEdgeInfo(id1, id2, qtEachTypeCo, qtPubCo) {
    var data = {
            "src": id1,
            "tgt": id2,
            "labels": null,
            "values": qtEachTypeCo
                .concat([qtPubCo])
                .concat(new Array(30).fill(0)) // this needs to go (one day)
            // "documents": documents
        };

    return data;
}

window.transformData = transform
export {transform}
