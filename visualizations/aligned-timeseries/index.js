import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {LineChart, Card, CardBody, NrqlQuery, Spinner} from 'nr1';

const defaultColors=['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffffff', '#000000']


function AlignedTimeseries(props) {
    const {customNrqlQueries, nrqlQueries, alignment, colorMap} = props;
    const [queryResults, setQueryResults] = useState(null);
    
    //cinfug option used to be called "nrqlQueries" but this hit a bug with a pltaform release. To be deployable without immediately breaking charts we support the old config, but you will need to upgrade.
    let NRQLqueries = (customNrqlQueries !== null && customNrqlQueries !== undefined) ? customNrqlQueries : (nrqlQueries !== null && nrqlQueries!==undefined) ?  nrqlQueries : []; 

    let colors = colorMap ? colorMap.split(',') : defaultColors
    
    
    useEffect(async () => { 
            let promises=NRQLqueries.map((q)=>{return NrqlQuery.query({accountIds: [q.accountId], query: q.query,formatTypeenum: NrqlQuery.FORMAT_TYPE.CHART})})
            let data = await Promise.all(promises)
            setQueryResults(data)
     },[props]);

   
    if(queryResults ) {
        let seriesAlignment = !alignment || alignment =="" ? "start" : alignment
        const determineComparisonPoint = (r) => {
            let comparisonPoint
            switch(seriesAlignment) {
                case "middle":
                    let midpoint = parseInt((r.data[0].data.length / 2)) - 1
                    comparisonPoint = comparisonPoint = r.data[0].data[ midpoint].x
                    break;
                case "end":
                    comparisonPoint = r.data[0].data[r.data[0].data.length-1].x
                    break;
                default:
                    comparisonPoint = r.data[0].data[0].x
            }
            return comparisonPoint
        }

        //start alignment
        let latest=0
        queryResults.forEach((r)=>{
            if(r.data && r.data[0] && r.data[0].metadata && r.data[0].data) {
                let comparisonPoint=determineComparisonPoint(r)
                if(comparisonPoint > latest) {
                    latest=comparisonPoint
                }
            }
        })

        queryResults.forEach((r,idx)=>{
            if(r.data && r.data[0] && r.data[0].metadata && r.data[0].data) {
                let comparisonPoint=determineComparisonPoint(r)
                let resultSetBeginTime=comparisonPoint
                let offset=latest-resultSetBeginTime
                if(offset > 0) {
                    r.data[0].data.forEach((row)=>{
                        row.x= row.x + offset
                    })
                } 
                r.data[0].metadata.color=NRQLqueries[idx].color ? NRQLqueries[idx].color : colors[idx % colors.length]
            }
        })

        //determine latest result set, we'll align everything to that one
        let chartData=[]
        queryResults.forEach(r=>{ if(r.data && r.data[0] )  {chartData.push(r.data[0])}})
        return <LineChart fullWidth fullHeight data={chartData} />

    } else {
        return <div className="EmptyState">
            
                <div className="loader"><Spinner inline/> Loading and aligning data...</div>
              
            </div>
        
    }
  }

  
export default AlignedTimeseries;
