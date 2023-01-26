import './App.css';
import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import Globe from 'react-globe.gl'
import * as d3 from 'd3'
import {Backdrop, CircularProgress} from '@mui/material';
import RG_stations_listed from "./data/Jan_24_2023/stations_listed.csv"
import RG_locations_listed from "./data/Jan_24_2023/locations_listed.csv"
// import RG_metadata from "./data/Jan_24_2023/metadata.csv"
import RG_metadata from "./data/Jan_24_2023/metadata_removetime.csv"
// import RG_streamDetail from "./data/Jan_24_2023/streamDetail.csv"
import Pie from "./Components/Piechart";

// [{ lat: 19.6, lng: 80, altitude: 0.6 },{ lat: 50, lng: 60, altitude: 0.4 },{ lat: 31.3037101, lng: -89.29276214, altitude: 0.4 },{ lat: 33.5842591, lng: -101.8804709, altitude: 0.6 }]
// const MAP_CENTERs = [{ lat: 87.5842591, lng: -70.8804709, altitude: 1.8 }];
// const MAP_CENTERs = [{ lat: -92.52824601944323, lng: 38.31079101844495, altitude: 1.8 },{ lat: 51.58421865, lng: 45.9571029, altitude: 1.8 },{ lat: 31.3037101, lng: -89.29276214, altitude: 1.8 },{ lat: 33.5842591, lng: -101.8804709, altitude: 1.8 }];
// const MAP_CENTER = { lat: 33.5842591, lng: -101.8804709, altitude: 0.6 };
const OPACITY = 0.3;
const RING_PROPAGATION_SPEED = 1; // deg/sec
const TOP = 20;
const colorArr = ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];

const arcThickScale = d3.scaleLinear().range([0.01,0.7]);
const contriesScale = d3.scaleLinear().range([0.1,0.7]);
// const weightColor = d3.scaleSequentialSqrt(d3.interpolateYlOrRd)
//     .domain([0, 1e7]);




function App() {
    const globeEl = useRef();
    // const [filterKeys, setfilterKeys] = useState({country:{"United States":true,"Brazil":true,"United Kingdom":true,"Spain":true,"France":true,"Italy":true,"Argentina":true,"Germany":true,"Colombia":true,"Mexico":true,"Canada":true,"Netherlands":true,"Russia":true,"Greece":true,"Australia":true}});
    const [filterKeys, setfilterKeys] = useState(undefined);
    const [colorKey, setColorKey] = useState('country');
    const [logos, setLogos] = useState([]);
    const [rawData, setRawData] = useState({stationData:[],locationData:[],metaData:[]});
    const [locs, setLocs] = useState([]);
    const [constries, setConstries] = useState([]);
    const [genre, setGenre] = useState([]);
    const [city, setcity] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [hoverArc, setHoverArc] = useState();
    const [selectPoint, setSelectPoint] = useState();
    const [currentSequnce,setCurrentSequnce] = useState(0);
    const [isPending,setIsPending] = useState(true);
    const [MAP_CENTERs,setMAP_CENTERs] = useState([{ lat: -92.52824601944323, lng: 38.31079101844495, altitude: 1.8 },{ lat: 51.58421865, lng: 45.9571029, altitude: 1.8 },{ lat: 31.3037101, lng: -89.29276214, altitude: 1.8 },{ lat: 33.5842591, lng: -101.8804709, altitude: 1.8 }]);
    const colorsCategory = useMemo(()=>{
        return function(otherColor="#454545"){
            const scale = d3.scaleOrdinal(colorArr);
            let master = (val)=>{
                if ((!val)||(val==='')||(val.trim===''))
                    return 'black'
                const domain = scale.domain();
                if (domain.find(d=>d===val)|| (domain.length<TOP))
                    return scale(val);
                else
                    return otherColor
            };
            master.domain = scale.domain;
            master.range = scale.range;
            return master;
        }();
    },[]);

    function handleData(stationData, locationData, metaData) {
        const groupByLocation = d3.groups(stationData, d => d["city_id"]);
        const range = d3.extent(groupByLocation, d => d[1].length);
        arcThickScale.domain(range);
        // weightColor.domain([0, range[1]])
        // route
        console.time('---group meta---')
        const byLocName = d3.group(locationData, d=>d['city_id']);
        const metabyLocName = d3.group(metaData,d=>d['city_id']);
        console.timeEnd('---group meta---')

        const locs = groupByLocation.map(d => {
            const meta = metabyLocName.get(d[0])??[];
            const locinfo = (byLocName.get(d[0])??[])[0]??{};
            return {
                ...locinfo,
                "title": `${locinfo.city} - ${locinfo.country}`,
                count: d[1].length,
                values: d[1],
                genre: d3.groups(meta,d=>d.station_genre).map(d=>{d.title=d[0];d.count=d[1].length;return d}),
                // city: d3.groups(meta,d=>d.city).map(d=>{d.title=d[0];d.count=d[1].length;return d}),
                city: [[locinfo.city,meta]].map(d=>{d.title=d[0];d.count=d[1].length;return d}),
            }
        });
        locs.sort((a, b) => b.count - a.count);


        const constries = d3.groups(stationData, d => d["country"]).map(d => {
            return {
                "title": d[0],
                long: d3.mean(d[1], e => e.long),
                lat: d3.mean(d[1], e => e.lat),
                count: d[1].length,
                values: d[1]
            }
        }).sort((a, b) => b.count - a.count);

        contriesScale.domain(d3.extent(constries, d => d.count));

        const genre = d3.groups(metaData, d => d["station_genre"]).map(d => {
            return {
                "title": d[0],
                count: d[1].length,
                values: d[1]
            }
        }).sort((a, b) => b.count - a.count);


        const city = d3.groups(stationData, d => d["city"]).map(d => {
            return {
                "title": d[0],
                long: d3.mean(d[1], e => e.long),
                lat: d3.mean(d[1], e => e.lat),
                count: d[1].length,
                values: d[1],
                country: d[1][0].country,
                city: d[1][0].city,
            }
        }).sort((a, b) => b.count - a.count);

        //color
        colorsCategory.domain([]).range(colorArr);
        constries.forEach(d=>colorsCategory(d.title));

        let order = 0;
        [0,1,2,3,0].forEach(i=> {
            if (!MAP_CENTERs[order])
                MAP_CENTERs[order] = {lat:0,lng:0,altitude:1}
            MAP_CENTERs[order].lat = constries[i].lat;
            MAP_CENTERs[order].lng = constries[i].long;
            order++
        })
        console.log('constries length: ',constries.length);
        console.log('location length: ',locs.length);
        return {locs, constries,genre,city,MAP_CENTERs};
    }

    useEffect(() => {
            console.time('Load and process data');
            console.time('-Load data-');
            // load data
            Promise.all([
                d3.csv(RG_stations_listed),
                d3.csv(RG_locations_listed),
                d3.csv(RG_metadata),
                // d3.csv(RG_streamDetail),
            ]).then(([stationData, locationData, metaData]) => {
                console.timeEnd('-Load data-');
                console.time('-Correct data-');
                const locationDataMap = {};
                locationData.forEach(d => {
                    d.lat = (+d.longitude);
                    d.long = (+d.latitude);
                    delete d.longitude;
                    delete d.latitude;
                    locationDataMap[d['city_id']] = d;
                });
                let stationDataMap = {};
                stationData.forEach(d => {
                    d.lat = locationDataMap[d['city_id']].lat;
                    d.long = locationDataMap[d['city_id']].long;
                    d.country = locationDataMap[d['city_id']].country;
                    d.city = locationDataMap[d['city_id']].city;
                    stationDataMap[d['station_id']] = d;
                });

                // let streamDetailMap = {};
                // streamDetail.forEach(s=>{
                //     streamDetailMap[s['stream_detail_id']] = s;
                // })
                metaData.forEach((d) => {
                    d.station_genre = stationDataMap[d['station_id']].station_genre
                    // if (d.stream_genre==="(null)")
                    //     d.stream_genre = "unspecified";
                    // if (d.stream_genre==="top40")
                    //     d.stream_genre="top 40";
                    // if (d.stream_genre==="varios")
                    //     d.stream_genre="various";
                })
                // const rawData = {stationData,locationData,metaData:metaData.filter(d=>d.city!=='')};
                const rawData = {stationData, locationData, metaData};
                console.timeEnd('-Correct data-');
                console.time('-filterdata-');
                filterdata(rawData);
                console.timeEnd('-filterdata-');
                console.timeEnd('Load and process data');
                setIsPending(false);
                globeEl.current.pointOfView(MAP_CENTERs[0], 4000)
            });
    }, []);
    const filterdata = useCallback((_rawData=rawData)=>{
        let stationData = _rawData.stationData.slice();
        let locationData = _rawData.locationData.slice();
        let metaData = _rawData.metaData.slice();
        if (filterKeys){
            if (filterKeys.country){
                stationData = stationData.filter(d=>filterKeys.country[d.country]);
                locationData = locationData.filter(d=>filterKeys.country[d.country]);
                metaData = metaData.filter(d=>filterKeys.country[d.country]);
            }
            if (filterKeys.genre){
                metaData = metaData.filter(d=>filterKeys.country[d.genre]);
            }
        }
        console.time('--handleData--');
        const {locs, constries, genre,city,MAP_CENTERs} = handleData(stationData, locationData,metaData);
        console.timeEnd('--handleData--');
        setLocs(locs);
        setConstries(constries);
        setGenre(genre);
        setcity(city);
        setMAP_CENTERs(MAP_CENTERs);
        setCurrentSequnce(0);
    },[filterKeys,rawData]);

    const [timer,setTimer] = useState(null);
    useEffect(()=>{
        if (globeEl.current) {
            if (currentSequnce < MAP_CENTERs.length) {

                const interval = setTimeout(() => {
                    globeEl.current.pointOfView(MAP_CENTERs[currentSequnce], 4000)
                    setCurrentSequnce(currentSequnce + 1);
                }, 4000);
                setTimer(interval);
                return () => {
                    clearInterval(interval);
                };
            }
        }
    },[currentSequnce,MAP_CENTERs])
    const stopPlay = useCallback(()=>{
        if (timer)
            clearInterval(timer);
        setCurrentSequnce(MAP_CENTERs.length);
    },[timer]);

    const zoomTo = useCallback((lng,lat)=>{
        if (globeEl.current) {
            stopPlay();
            globeEl.current.pointOfView({ lat, lng, altitude: 0.8 }, 2000);
        }
    },[currentSequnce,stopPlay])

    return  <div
        className="App"
        style={{
            background: "#000010",
            position: "relative"
        }}
    >
        <div style={{
            transform: "translate(-20%, 0)",
            width: '130wh'
        }}>
            <Globe
            ref={globeEl}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"


            // arcsData={routes}
            // arcLabel={d => `${d.name}`}
            // arcStartLat={d => +d.src.lat}
            // arcStartLng={d => +d.src.long}
            // arcEndLat={d => +d.dst.lat}
            // arcEndLng={d => +d.dst.long}
            // arcDashLength={0.4}
            // arcDashGap={0.8}
            // arcDashAnimateTime={d=>5000}
            // arcsTransitionDuration={1000}
            // arcStroke={d=>Math.sqrt(arcThickScale(d.data.length))}
            // arcColor={d => {
            //     const op = !hoverArc ? OPACITY : d === hoverArc ? 0.9 : OPACITY / 4;
            //     return [`rgba(0, 255, 0, ${op})`, `rgba(255, 0, 0, ${op})`];
            // }}

            // onArcHover={setHoverArc}

            // pointsData={locs}
            // pointColor={d => d.color??'orange'}
            // pointLat={d => d.lat}
            // pointLng={d => d.long}
            // pointAltitude={0}
            // pointRadius={d => arcThickScale(d.count)}
            // pointsMerge={true}

            labelsData={constries}
            labelLat={d => d.lat}
            labelLng={d => d.long}
            labelAltitude={d=>(selectPoint&&(selectPoint===d))?0.01:0.1}
            labelText={d => d['title']}
            labelSize={d => (selectPoint&&(selectPoint===d))?0.8:arcThickScale(d.count)/3}
            labelDotRadius={d => 0}
            labelColor={d => (selectPoint&&(selectPoint===d))?('#dd6700'):(d.color??'white')}
            labelResolution={2}

            hexBinPointsData={locs}
            hexBinPointWeight="count"
            hexBinPointLng={d => d.long}
            hexBinPointLat={d => d.lat}
            hexAltitude={d => arcThickScale(d.sumWeight)}
            hexBinResolution={4}
            hexTopColor={d => colorsCategory(d.points[0][colorKey])}
            hexSideColor={d => colorsCategory(d.points[0][colorKey])}

            hexBinMerge={true}
            hexLabel={d => {console.log(d); return `
            <b>${d.points.length}</b> stations:<ul><li>
              ${d.points.slice().sort((a, b) => b.count - a.count).map(d => d.title).join('</li><li>')}
            </li></ul>
          `}}

            // ringsData={[locs[locs.length-1]]}
            // ringLat={d => d.lat}
            // ringLng={d => d.long}
            // ringColor={() => t => `rgba(255,100,50,${1-t})`}
            // ringMaxRadius={d=>arcThickScale(d.count)*5}
            // ringPropagationSpeed={d=>arcThickScale(d.count)*RING_PROPAGATION_SPEED}

            // htmlElementsData={logos}
            // htmlLat={d => d.lat}
            // htmlLng={d => d.long}
            // htmlElement={<h1>We are here</h1>}
            onGlobeClick={stopPlay}
            />
        </div>
        <div
            style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                padding: "80px",
                display: "flex",
                alignItems: "center",
                flexDirection: "column"
            }}
        >
            {/*<h2 style={{color:'white'}}>Top 15 countries</h2>*/}
            <div style={{
                display: "flex",
                alignItems: "right",
                color: "#fff",
                // flexDirection: "column",
                height:'calc(100vh - 200px)',
                width:'100%',
                padding:'10px',
                position:'relative',
                overflowY:'auto',
                overflowX: 'hidden',
                background: '#ffffff0d',
                borderRadius:'5px',
                marginBottom:'10px',
                fontSize:'small',
            }} className="sc1">
                <div style={{width:'50%',height:'200px',position:'relative'}}>
                    <h3>Countries</h3>
                    <Pie
                        data={constries}
                        valueKey={(d)=>d.count}
                        displayText={(d,i)=>i<TOP?null:'none'}
                        colors={(d,i)=>colorsCategory(d.data.title)}
                        width={200}
                        height={200}
                        top={TOP}
                        innerRadius={60}
                        outerRadius={100}
                        unit={'stations'}
                        onClickItem={(d)=>{zoomTo(d.long,d.lat)}}
                    />
                </div>
                <div style={{width:'50%',height:'200px'}}>
                    <h3>Cities</h3>
                    <Pie
                        data={city}
                        displayText={(d,i)=>i<TOP?null:'none'}
                        colors={(d,i)=>i<TOP?colorsCategory(d.data[colorKey]):'#454545'}
                        // colors={(d,i)=>i<TOP?'gray':'#454545'}
                        valueKey={(d)=>d.count}
                        width={200}
                        height={200}
                        top={TOP}
                        innerRadius={60}
                        outerRadius={100}
                        unit={'stations'}
                        onClickItem={(d)=>{zoomTo(d.long,d.lat)}}
                    />
                </div>
                <div style={{width:'50%',height:'200px'}}>
                    <h3>Genres</h3>
                    <Pie
                        data={genre}
                        displayText={(d,i)=>i<TOP?null:'none'}
                        colors={(d,i)=>i<TOP?((d.data.title!=='')?'gray':'#424242'):'#454545'}
                        valueKey={(d)=>d.count}
                        width={200}
                        height={200}
                        top={TOP}
                        innerRadius={60}
                        outerRadius={100}
                        unit={'streams'}
                    />
                </div>
            </div>
            <div style={{
                display: "flex",
                alignItems: "center",
                fontSize: "60px",
                color: "#fff",
            }}
                 onClick={()=>{setCurrentSequnce(0)}}
            >
                {/*Radio Garden  <img src={ttulogo} width={"70px"} alt="Logo" />*/}
            </div>
        </div>
        {isPending&&<Backdrop
            sx={{color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1}}
            open={true}
        >
            <h1>Rendering...</h1>
            <CircularProgress color="inherit"/>
        </Backdrop>}
    </div>;
}

export default App;
