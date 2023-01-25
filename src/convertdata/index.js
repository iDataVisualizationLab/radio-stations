import * as d3 from "d3";
import Testdata from "./MIRAGE_MC.csv";

d3.csv(Testdata).then(d=>{
    // there are station in different city_id
    // replace NaN and -
    const generalKeys = Object.keys(d[0]);
    d.forEach(d=>generalKeys.forEach(k=>{
        d[k] = (d[k]==='NaN'||d[k]==='-')?'':d[k];
    }))

    // reduce size by seperate files

    // add stream detail id
    const streamDetailKeys = ['stream_detail_id','stream_title', 'stream_artist', 'stream_song', 'stream_codec', 'stream_bitrate', 'stream_framerate', 'stream_channels'];
    const streamDetailGroup = d3.groups(d,d=>streamDetailKeys.map(k=>d[k]).join(''));//'stream_codec', 'stream_bitrate', 'stream_framerate', 'stream_channels'
    streamDetailGroup.forEach((s,si)=>s[1].forEach(s=>s['stream_detail_id']=si));

    const stationKeys = ['city_id','utcOffset','station','station_id','url','station_name','station_description','station_genre','station_url'];
    const locationKeys = ['city_id','latitude','longitude','city','country'];
    const streamKeys = ['city_id', 'station_id', 'time_station', 'stream_detail_id'];
    // const station_id = d3.groups(d,d=>d['stream_title']);//'stream_codec', 'stream_bitrate', 'stream_framerate', 'stream_channels'
    // const u = station_id.map(d=>d3.groups(d[1],d=>['stream_title', 'stream_artist', 'stream_song'].map(k=>d[k]).join(',')))

    //meta data
    const streamData = d.map(_s=>{
        const s = {};
        streamKeys.forEach(k=>s[k]=_s[k]);
        return s;
    });
    // to csv
    // console.log(to_csv(streamData))

    // stream detail
    const streamDetail = streamDetailGroup.map(u=> {
        const s = {};
        streamDetailKeys.forEach(k=>s[k]=u[1][0][k]);
        return s;
    })
    console.log(Papa.unparse(streamDetail))

    // station detail
    const stationDetail = d3.groups(d,d=>['station_id','city_id'].map(k=>d[k]).join('')).map(u=> {
        const s = {};
        stationKeys.forEach(k=>s[k]=u[1][0][k]);
        return s;
    })
    // console.log(to_csv(stationDetail))

    // station detail
    const locationDetail = d3.groups(d,d=>['city_id'].map(k=>d[k]).join('')).map(u=> {
        const s = {};
        locationKeys.forEach(k=>s[k]=u[1][0][k]);
        return s;
    })
    // console.log(to_csv(locationDetail)) //meta data

    debugger
    function to_csv(arr){
        let checkComma = new RegExp(',')
        let k = Object.keys(arr[0]);
        return k.join(',')+'\n'+ arr.map(o=>{
            return k.map(k=> {
                o[k] = o[k].replace(/"/g,'\"');
                checkComma.test(o[k]) ? `"${o[k]}"` : o[k]
            }).join(',')
        }).join('\n')
    }
});