import Swal from 'sweetalert2'

import state from "../mgexplorer/store"
import isHTML from 'is-html';
import detectCSV from 'detect-csv';
import { transform } from './trans_mg4'

/**
* Clear cache that stored from server
*/
function clearQueryCache(form, query) {

    if (!state.routes || !state.routes.cache) return;
    
    let data = { ...query }
    if (form) {
        data = getFormData(form)
        data.id = query.id
    }

    let routedata = state.routes.cache.delete

    // Send request
    fetch(routedata.route, {
        method: routedata.method,
        headers: routedata.headers,
        body: JSON.stringify(data)
    }).then(response => {
        toast("Cache cleared!")
    }).catch(error => {
        console.log(error);
    });
}

      
/**
 * Process the request query with selected query
 * The process includes complete SPARQL query path, send request to server and process result from server
 */
async function processQuery(query, form) {
    let data = { ...query }
    if (form) {
        data = getFormData(form)
        data.id = query.id
    } 

    let tuneResult = await tune(data)
    if (tuneResult && tuneResult.message) {
        return await getResult(tuneResult, data)
    }

    if (state._cache && state.routes.cache && query.id) { // check if cache file is available
        let routedata = state.routes.cache.get
        let response = await fetch(routedata.route, { 
            method: routedata.method, 
            headers: routedata.headers, 
            body: JSON.stringify(query) 
        })

        if(response.status >= 200 && response.status < 300) {
            return await response.json()
        }
    }

    let result = await sendRequest(data)

    if (state._cache && state.routes.cache && query.id) { // write file on cache if enabled
        let routedata = state.routes.cache.write
        await fetch(routedata.route, { 
            method: routedata.method, 
            headers: routedata.headers, 
            body: JSON.stringify({ result: result, query: query }) 
        })    
    }

    return result
}


async function prepare(query) {
    query = encodeURIComponent(query);
    query = query.replace(/\%20/g, "+");
    query = query.replace(/\(/g, "%28");
    query = query.replace(/\)/g, "%29");
    return query;
}

/**
  * This funtion will send the request to the server to get the data from completely SPARQL query
  * 
*/
async function sendRequest(values) {

    let url = values.endpoint + "?query=";
    url = url + await prepare(values.query)

    let headers = {
        accept: "application/sparql-results+json"
    }
        
    let response = await fetch(url, { method: 'GET', headers: headers})

    let res = await response.json()
    
    let result = {}
    try{
        if (res.results) {
            if (res.results.bindings && res.results.bindings.length) {
                const keys = res.head.vars
                if (keys.includes('p') && (keys.includes('author') || (keys.includes('s') && keys.includes('o')))) {
                    result = { ...res }
                } else result.message = 'Missing mandatory variables'
            } else if (!res.results.bindings) {
                result.message = "Data format issue: Not W3C compliant"
            } else if (!res.results.bindings.length) {
                result.message = 'No results'
            }
        } else if (Object.keys(res).includes('status')) {
            
            switch(res.status) {
                case 0:
                    if (res.statusText) {
                        switch(e.statusText.code) {
                            case 'ERR_TLS_CERT_ALTNAME_INVALID':
                                result.message = 'Invalid Certificate'
                                break;
                            case 'ETIMEDOUT':
                                result.message = 'Timeout'
                                break;
                            case 'ENOTFOUND':
                                result.message = 'Service Not Found'
                                break;
                            default: // 'ECONNREFUSED', EPROTO, etc.
                                result.message = 'Service Unreachable'
                        }
                    } 
                    else {
                        result.message = 'Service Unreachable'
                    }
                    break;
                case 400:
                    result.message = "Bad Request"
                    break;
                case 401:
                case 403:
                case 407:
                case 511:
                    result.message = 'Access Unauthorized'
                    break;
                case 404:
                case 410:
                    result.message = 'Service Not Found'
                    break;
                case 406:
                    result.message = 'Format Not Supported'
                    break;
                case 408:
                case 504:
                    result.message = 'Timeout'
                    break;
                case 503:
                case 500:
                    if (e.response.includes('Virtuoso 42000 Error')) result.message = 'Timeout'
                    else result.message = "Service Unavailable"
                    break;
                default:
                    if (isHTML(e.response)) {
                        let title = e.response.match(/<title[^>]*>([^<]+)<\/title>/)
                        if (!title) {
                            if (e.response.includes('Virtuoso 42000 Error')) {
                                result.message = 'Timeout'
                            } else {
                                result.message = e.response.split('\n')[0]
                            }
                        }
                        else result.message = title[1]
                    }
            }
        } else if (!res.results) {
            result.message = "Data format issue: Not W3C compliant"
        }                  
    } catch(e) {
        result.response = text
        if (text === undefined) result.message = undefined
        else if (typeof text === "string" && text.startsWith("Virtuoso 42000 Error")) 
            result.message = "Timeout"
        else if (isHTML(text)) { 
            result.message = 'Data format issue: HTML'
        } else if (detectCSV(text)) {
            result.message = 'Data format issue: CSV'
        } else {
            result.message = 'Unknown'
        } 
    }

    return await getResult(result, values)

}

/**
 * complete SPARQL query with data from HTML form such as year, lab, country
 */
async function tune(data) {
    if (!data.params) return;

    let params = data.params;

    for (let p of Object.keys(params)) {
        // Replace metadata by selected value of corresponding list
        if (p == 'country' && params[p]) {
            // Parse country for Virtuoso
            data.query = data.query.replaceAll('$country', params[p])
            data.query = data.query.replace(/countrye/, params[p].replace(/ /, "_"));
            data.query = data.query.replace(/countryf/, getFrenchName(params[p]));
        } else if (p == 'period') {
            data.query = data.query.replaceAll('$beginYear', params[p][0])
            data.query = data.query.replaceAll('$endYear', params[p][1])
        } else if (p == 'lab' && params.type == 2) {
            data.query = data.query.replaceAll('$lab1', params[p][0])
            data.query = data.query.replaceAll('$lab2', params[p][1])
        } else if (p == 'lab') {
            data.query = data.query.replaceAll('$lab1', params[p][0])
        } else if (p == 'value') {
            // let regex = new RegExp("\b\$value\d+\b");
            let necessaryValues = [...data.query.matchAll(/\$value\d+/g) ] // find all values used in the query through the patten $value
            necessaryValues = necessaryValues.map(d => d[0]) // keep only the value label
            necessaryValues = necessaryValues.filter( (d,i) => necessaryValues.indexOf(d) === i) // keep only unique values

            if (necessaryValues.length > params[p].length) {
                return {message: `This query requires ${necessaryValues.length} values. You provided ${params[p].length}. Please select the necessary amount of values.` }
            }

            params[p].forEach((v,i) => {
                data.query = data.query.replaceAll('$value'+(i+1), v)
            })
        } else if (p == 'prefixes'){
            if (params[p] != null)
            params[p].forEach(pre => {
                data.query = pre + '\n' + data.query;
            })
        }
    }

    return true; // validate the tuning
}

async function requestFile(data) {
    if (!state.routes || !state.routes.dataset ) return

    let routeInfo = state.routes.dataset

    let result = await fetch(routeInfo.route + data.filename, { method: routeInfo.method })
        .then( async function(response){
        if(response.status >= 200 && response.status < 300){
            return await response.text().then(text => {
                return JSON.parse(text);
            })}
        else return response
    })

    if (!result.data.length) 
        result = { message: `No data records found in the database.`}

    return await getResult(result.data, result.stylesheet)
}

/**
Receives the result from the query and proceed to visualization
*/
async function getResult(res, query) {
    let result = res

    // transform data for MGExplorer
    if (!res.message) {
        if (res.results) {
            result = await transform(res.results.bindings, query.stylesheetActive ? query.stylesheet : null);
            result.sparql = res
        }
        else {
            result = await transform(res, query) // for file data (hceres, i3s) -> query == stylesheet
        }
    }

    if (result.mge)
        result.mge.nodes.dataNodes.forEach(node => node.idOrig = node.id) /// mgexplorer does not work without this, but I don't know why

    return result.mge || result
}

/*------------------ query functions ------------------------*/

/**
*Get data from the form after user chose option for endpoint, query and custom variable
* 
*/
function getFormData(form) {

    let content = form['query_content'] ? form['query_content'].value : null
    return {
        'query': content,
        'name': form['query_name'] ? form['query_name'].value: null,
        'endpoint': form['query_endpoint'] ? form['query_endpoint'].value.trim() : null,
        'params': {
            "type": form['query_type'].value,
            'lab': [ content && content.includes("$lab1") ? form['query_lab1'].value : '', 
                content && content.includes("$lab2") ? form['query_lab2'].value : '' ],
            'country': content && content.includes("$country") ? form['query_country'].value : '',
            'period': [ content && content.includes("$beginYear") ? +form['from_year'].value : '', 
                content && content.includes("$endYear") ? +form['to_year'].value : '' ],
            'value': getValues(form) 
        },
        'stylesheetActive': form['check_stylesheet'].checked,
        'stylesheet': form['stylesheet_content'].value.length > 0 ? JSON.parse(form['stylesheet_content'].value) : null
    }
}

function getValues(form) {
    let selectedValues = []

    let container = form.querySelector("#selectedValues")
    let children = container.querySelectorAll('.selected-value')
   
    children.forEach(element => selectedValues.push(element.textContent.trim()))
   
    return selectedValues
}

/*---------------- helper functions --------------*/

function getFrenchName(country) {
    if (country == "France") return "France";
    if (country == "United Kingdom") return "Royaume-Uni";
    if (country == "United States") return "États-Unis";
    if (country == "Spain") return "Espagne";
    if (country == "Germany") return "Allemagne";
    if (country == "Italy") return "Italie";
    if (country == "Portugal") return "Portugal";
    if (country == "China") return "Chine";
    if (country == "Japan") return "Japon";
    if (country == "Vietnam") return "Vietnam";
    if (country == "Russia") return "Russie";
    if (country == "Brazil") return "Brésil";
    if (country == "Mexico") return "Mexique";
    if (country == "Morocco") return "Maroc";
    return "unknown";
}

/**
 * Create a toast notification to inform to users
 */
 function toast(message) {
    const options = {
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        type: "success",
        title: message
    } 
    Swal.fire(options);
}

export { processQuery, clearQueryCache, sendRequest, requestFile, getResult }