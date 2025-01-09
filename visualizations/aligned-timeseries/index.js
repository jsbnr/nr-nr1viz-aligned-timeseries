import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {LineChart, Card, CardBody, NrqlQuery, Spinner} from 'nr1';
import chroma from "chroma-js";

const defaultColors=[ '#3cb44b', '#e6194b', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffe119']


function AlignedTimeseries(props) {

    const {customNrqlQueries, nrqlQueries, alignment, colorMap} = props;
    const [queryResults, setQueryResults] = useState(null);
    
    //cinfug option used to be called "nrqlQueries" but this hit a bug with a pltaform release. To be deployable without immediately breaking charts we support the old config, but you will need to upgrade.
    let NRQLqueries = (customNrqlQueries !== null && customNrqlQueries !== undefined) ? customNrqlQueries : (nrqlQueries !== null && nrqlQueries!==undefined) ?  nrqlQueries : []; 

    let colors = colorMap ? colorMap.split(',') : defaultColors
    let colorCycler=0;

    const getNextColor = () => {
        let returnColor=defaultColors[colorCycler]
        colorCycler++
        if(colorCycler >= defaultColors.length) {
            colorCycler=0;
        }
        return returnColor

    }


    useEffect(() => { 
        const fetchData = async () => {
            try {
                    let promises=NRQLqueries.map((q)=>{return NrqlQuery.query({accountIds: [q.accountId], query: q.query,formatTypeenum: NrqlQuery.FORMAT_TYPE.CHART})});
                    let data = await Promise.all(promises);
                    setQueryResults(data);  
            } catch (error) {
                console.error(error)
            }
           
        }
        fetchData();
     },[props]);

   
    if(queryResults ) {
        let seriesAlignment = (!alignment || alignment =="" || alignment === null || alignment === undefined) ? "start" : alignment
        const determineComparisonPoint = (seriesData) => {
            let comparisonPoint
            switch(seriesAlignment) {
                case "middle":
                    let midpoint = parseInt((seriesData.data.length / 2)) - 1
                    comparisonPoint = comparisonPoint = seriesData.data[ midpoint].x
                    break;
                case "end":
                    comparisonPoint = seriesData.data[seriesData.data.length-1].x
                    break;
                default:
                    comparisonPoint = seriesData.data[0].x
            }
            return comparisonPoint
        }

        //start alignment
        let latest=0
        queryResults.forEach((r)=>{
            if(r.data && r.data[0] && r.data[0].metadata && r.data[0].data) {
                let comparisonPoint=determineComparisonPoint(r.data[0])
                if(comparisonPoint > latest) {
                    latest=comparisonPoint
                }
            }
        })


        const performAlignment = (seriesData,color) => {
            let workingData=seriesData
            let comparisonPoint=determineComparisonPoint(workingData)
            let resultSetBeginTime=comparisonPoint
            let offset=latest-resultSetBeginTime
            if(offset > 0) {
                workingData.data.forEach((row)=>{
                    row.x= row.x + offset
                })
            } 
            workingData.metadata.color=color;
        }
       
        queryResults.forEach((r,idx)=>{
            if(r.data) {
                if(r.data[0] && r.data[0].metadata && r.data[0].data) {
                    performAlignment(r.data[0],NRQLqueries[idx].color ? NRQLqueries[idx].color : getNextColor())
                }
                if(r.data[1] && r.data[1].metadata && r.data[1].data) { //for compare with support
                    performAlignment(r.data[1],NRQLqueries[idx].color ? chroma(NRQLqueries[idx].color).alpha(1).darken(2).hex() : getNextColor()) //ifcolour provided lets darken it a touch for compare
                }
            }
        })

        //determine latest result set, we'll align everything to that one
        let chartData=[]
        queryResults.forEach(r=>{ 
            if(r.data && r.data[0] )  {chartData.push(r.data[0])}
            if(r.data && r.data[1] )  {chartData.push(r.data[1])}
        })
        return <LineChart fullWidth fullHeight data={chartData} />

    } else {
        return <div className="EmptyState">
            
                <div className="loader"><Spinner inline/> Loading and aligning data...</div>
              
            </div>
        
    }
  }

  
export default AlignedTimeseries;
