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

    Meteor.subscribe('gridvals');
    GridValues.find().observeChanges({
        added: function (id, pt) {
          var O3val = pt.OZONE;
          var AQIcolor = '#b3cce6';
          if (O3val>0) {AQIcolor='#3FAE4A'};
          if (O3val>40) {AQIcolor='#F6EC26'};
          if (O3val>56) {AQIcolor='#ff0000'};
          var circle = L.circle([pt.loc[1], pt.loc[0]], 500, {
            color: AQIcolor,
            fillColor: AQIcolor,
            fillOpacity: 0.5
          }).addTo(AQmap);
          //    console.log(pt)
                // var marker = L.marker([pt.loc[1], pt.loc[0]], {
               //}).addTo(AQmap);
            } //end of added

    });


    $('#displayMap').css('height', window.innerHeight - 20);
    L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';

    AQmap.setView([latude, lngtude], 9);

    L.tileLayer.provider('OpenStreetMap.DE').addTo(AQmap);

});
