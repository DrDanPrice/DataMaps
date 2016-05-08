var pollut = new ReactiveVar('OZONE');
//can selected times be global?
var startEpoch = new ReactiveVar(moment().subtract(1439, 'minutes').unix()); //24 hours ago - seconds
var endEpoch = new ReactiveVar(moment().unix());

Template.home.onRendered(function () {

    var latude = 29.721; //Houston
    var lngtude = -95.3443;

    var AQmap = L.map('displayMap', {
        doubleClickZoom: false
    });

    Meteor.subscribe('sites', [lngtude, latude]);
    //does lngtude/latude get used?
    Sites.find().observeChanges({
        added: function (id, line) {
                var marker = L.marker([line.loc.coordinates[1], line.loc.coordinates[0]], {
                    title: line['site name'] + line.AQSID
                }).addTo(AQmap);

                var content = "<a href='/site/" + line.AQSID + "'> pathfor this AQSID" + line.AQSID + ":  " + line['site name'] + "</a>";
                marker.bindPopup(content);
            } //end of added

    });

    //at some point, add workers: https://github.com/aparshin/leaflet-fractal/blob/master/FractalLayer.js
    //https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
    //but no object creation in Leaflet: https://github.com/Leaflet/Leaflet/issues/2625
    Meteor.subscribe('gridvals');
    var latlngs = [];
    //GridValues.find({$and: [ { gridsizex : 10 }, { gridsizey : 10 }]}).observeChanges({
    GridValues.find({grid10:true}).observeChanges({

    //then need to figure out how to assign right range
        added: function (id, pt) {
          var val = pt[pollut.get()];
          var O3val = pt.OZONE;
          var AQIcolor = '#b3cce6';
          if (O3val>0) {AQIcolor='#3FAE4A'};
          if (O3val>40) {AQIcolor='#F6EC26'};
          if (O3val>48) {AQIcolor='#ffcce6'};
          if (O3val>56) {AQIcolor='#ff0000'};
          // var polygon = L.polygon([
          //     [pt.loc[1]+.053, pt.loc[0]+.056],
          //     [pt.loc[1]-.053, pt.loc[0]+.056],
          //     [pt.loc[1]-.053, pt.loc[0]-.056],
          //     [pt.loc[1]+.053, pt.loc[0]-.056]],
          //     {color: AQIcolor,stroke: false,
          //       fillColor: AQIcolor,fillOpacity: 0.6})
          //       .addTo(AQmap);
        //  latlngs.push([pt.loc[1], pt.loc[0]]); //not in order
        //  var polyline = L.polyline(latlngs, {color: 'red'}).addTo(AQmap);
          //AQmap.fitBounds(polyline.getBounds());
          var radius = 5500;
          //if single km, should be about 150
          var circle = L.circle([pt.loc[1], pt.loc[0]], radius, {
            stroke: false,
            color: AQIcolor,
            fillColor: AQIcolor,
            fillOpacity: 0.6
          }).addTo(AQmap);

          //    console.log(pt)
                // var marker = L.marker([pt.loc[1], pt.loc[0]], {
               //}).addTo(AQmap);
            } //end of added
    });


    //AQmap.fitBounds(polyline.getBounds());
    $('#displayMap').css('height', window.innerHeight - 20);
    L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';

    AQmap.setView([latude, lngtude], 9);


    L.tileLayer.provider('OpenStreetMap.DE').addTo(AQmap);

});
Template.home.helpers({
    pollutant: function () {
        return 'OZONE';
    },

    selectedDate: function () {
        return moment.unix(endEpoch.get()).format('YYYY-MM-DD');
    }
});

Template.home.events({
    'change #datepicker': function (event) {
        startEpoch.set(moment(event.target.value, 'YYYY-MM-DD').unix());
        endEpoch.set(moment.unix(startEpoch.get()).add(1439, 'minutes').unix()); //always to current?
    },
    'change #pollutpick': function () {
        pollut.set(event.target.value)
    }
});
