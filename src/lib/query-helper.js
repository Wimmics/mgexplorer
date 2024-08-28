import Swal from 'sweetalert2'

import state from "../mgexplorer/store"
import { transform } from './trans_mg4'

/**
* Clear cache that stored from server
*/
async function clearQueryCache(form, query) {

    if (!state.routes || !state.routes.cache) return;
    
    let data = { ...query }
    if (form) {
        data = await getFormData(form)
        if (data && data.message) {
            alert(data.message)
            return;
        }
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
    })
}

      
/**
 * Process the request query with selected query
 * The process includes complete SPARQL query path, send request to server and process result from server
 */
async function processQuery(query, form) {
    let data = { ...query }
    if (form) {
        let formResult = await getFormData(form)
        if (formResult && formResult.message) {
            return await getResult(formResult, data)    
        }
        data = {... formResult}
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
            body: JSON.stringify(data) 
        }).catch(error => {  })

        if (response.status >= 200 && response.status < 300) {
            return await response.json()
        } 
    }

    let result = await sendRequest(data)

    if (!result.message && state._cache && state.routes.cache && query.id) { // write file on cache if enabled
        let routedata = state.routes.cache.write
        await fetch(routedata.route, { 
            method: routedata.method, 
            headers: routedata.headers, 
            body: JSON.stringify({ result: result, query: data }) 
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

    let result = {}
    let url = values.endpoint + "?query=" + await prepare(values.query)
    
    try{

        let response = await fetch(url, {
            method: "GET",
            mode: url.startsWith("https") ? "cors" : "no-cors",
            //mode: "no-cors", // For testing
            headers: {
                "Content-Type": "application/json", 
                'Accept': "application/sparql-results+json"
            }
        })
        

        if (response.ok) {
            try {
                let res = await response.json()
                if (res.results.bindings && res.results.bindings.length) {
                    const keys = res.head.vars
                    if (keys.includes('p') && (keys.includes('author') || (keys.includes('s') && keys.includes('o')))) {
                        result = { ...res }
                    } else result.message = '"Missing mandatory variables.\n Ensure that your SELECT query includes either the triplet `?s ?p ?o` or the variable `?author`."'
                } else if (!res.results.bindings) {
                    result.message = "Data format issue: Not W3C compliant"
                } else if (!res.results.bindings.length) {
                    result.message = 'No results'
                }
            } catch (e) {
                result.message = "An error occurred while processing the response.\nPlease try again later."
            }
        } else if (response.type === 'opaque') {
            result.message = "We encountered a problem with the request, but the exact issue could not be identified due to CORS policy restrictions.\nFor more details, please check the browser console."
        } else {
      
            switch(response.status) {
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
                default:
                    result.message = `Request failed with status: "${response.statusText} (${response.status})".`
               
            }
        }                 
    } catch(error) { // network issues

        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            result.message = 'Network error: Failed to fetch the resource.\nCheck the browser console for more information.'
        } else {
            result.message = 'An error occurred:', error.message
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
        switch (p) {
            case 'country':
                if (params[p]) {
                    // Parse country for Virtuoso
                    data.query = data.query.replaceAll('$country', params[p]);
                    data.query = data.query.replace(/countrye/, params[p].replace(/ /, "_"));
                    data.query = data.query.replace(/countryf/, getFrenchName(params[p]));
                }
                break;
        
            case 'period':
                data.query = data.query.replaceAll('$beginYear', params[p][0]);
                data.query = data.query.replaceAll('$endYear', params[p][1]);
                break;
        
            case 'lab':
                data.query = data.query.replaceAll('$lab1', params[p][0]);
                if (params[p][1]) {
                    data.query = data.query.replaceAll('$lab2', params[p][1]);
                }
                break;
        
            case 'value':
                params[p].forEach((v, i) => {
                    data.query = data.query.replaceAll('$value' + (i + 1), v);
                })

                if (data.stylesheet) {
                   
                    let string = JSON.stringify(data.stylesheet)
                    params[p].forEach((v,i) => {
                        string = string.replaceAll('$value'+(i+1), v)
                    })
                    data.stylesheet = JSON.parse(string)
                }
                break;
        
            default:
                // Default case if none of the above matches
                break;
        }
        
    }

    return true // validate the tuning
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
            result = await transform(res.results.bindings, query.stylesheetActive ? query.stylesheet : null)
            result.sparql = res
            result.stylesheet = query.stylesheet
        }
        else {
            result = await transform(res, query) // for file data (hceres, i3s) -> query == stylesheet
        }
    }

    if (result.mge)
        result.mge.nodes.dataNodes.forEach(node => node.idOrig = node.id) /// mgexplorer does not work without this, but I don't know why

    return result
}

/*------------------ query functions ------------------------*/

/**
*Get data from the form after user chose option for endpoint, query and custom variable
* 
*/
async function getFormData(form) {

    let content = form['query_content'] ? form['query_content'].value : null

    let customValues = getValues(form) 

    if (customValues && customValues.message) 
        return customValues

    return {
        'query': content,
        'name': form['query_name'] ? form['query_name'].value: null,
        'endpoint': form['query_endpoint'] ? form['query_endpoint'].value.trim() : null,
        'params': {
            'lab': [ content && content.includes("$lab1") ? form['query_lab1'].value : '', 
                content && content.includes("$lab2") ? form['query_lab2'].value : '' ],
            'country': content && content.includes("$country") ? form['query_country'].value : '',
            'period': [ content && content.includes("$beginYear") ? +form['from_year'].value : '', 
                content && content.includes("$endYear") ? +form['to_year'].value : '' ],
            'value': customValues
        },
        'stylesheetActive': form['check_stylesheet'].checked,
        'stylesheet': form['stylesheet_content'].value.length > 0 ? JSON.parse(form['stylesheet_content'].value) : null
    }
}

function getValues(form) {
    let selectedValues = []

    let container = form.querySelector("#values-container")
    let children = container.querySelectorAll('.custom_value')

    const dangerousCharacters = /[&<>"'`/]/g;
   
    for (let element of children) {
        let value = element.value
        if (value.match(dangerousCharacters)) {
            return { message : "Input contains invalid characters. Please remove any of the following: & < > \" ' ` /" }

        }
        selectedValues.push(value.trim())
    }
   
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