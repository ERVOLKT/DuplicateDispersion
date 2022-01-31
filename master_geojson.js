var layerTree = function (options) {
    'use strict';
    if (!(this instanceof layerTree)) {
        throw new Error('layerTree must be constructed with the new keyword.');
    } else if (typeof options === 'object' && options.map && options.target) {
        if (!(options.map instanceof ol.Map)) {
            throw new Error('Please provide a valid OpenLayers 3 map object.');
        }
        this.map = options.map;
        var containerDiv = document.getElementById(options.target);
        if (containerDiv === null || containerDiv.nodeType !== 1) {
            throw new Error('Please provide a valid element id.');
        }
        this.messages = document.getElementById(options.messages) || document.createElement('span');
        var controlDiv = document.createElement('div');
        controlDiv.className = 'layertree-buttons';
        controlDiv.appendChild(this.createButton('addwms', 'Add WMS Layer', 'addlayer'));
        controlDiv.appendChild(this.createButton('addwfs', 'Add WFS Layer', 'addlayer'));
        controlDiv.appendChild(this.createButton('addvector', 'Add Vector Layer', 'addlayer'));
        containerDiv.appendChild(controlDiv);
        this.layerContainer = document.createElement('div');
        this.layerContainer.className = 'layercontainer';
        containerDiv.appendChild(this.layerContainer);
        var idCounter = 0;
        this.createRegistry = function (layer, buffer) {
            layer.set('id', 'layer_' + idCounter);
            idCounter += 1;
            var layerDiv = document.createElement('div');
            layerDiv.className = buffer ? 'layer ol-unselectable buffering' : 'layer ol-unselectable';
            layerDiv.title = layer.get('name') || 'Layer ohne Namen';
            layerDiv.id = layer.get('id');
            var layerSpan = document.createElement('span');
            layerSpan.textContent = layerDiv.title;
            layerDiv.appendChild(layerSpan);
            this.layerContainer.insertBefore(layerDiv, this.layerContainer.firstChild);
            return this;
        };
        this.map.getLayers().on('add', function (evt) {
            if (evt.element instanceof ol.layer.Vector) {
                this.createRegistry(evt.element, true);
            } else {
                this.createRegistry(evt.element);
            }
        }, this);
    } else {
        throw new Error('Invalid parameter(s) provided.');
    }

};

layerTree.prototype.createButton = function (elemName, elemTitle, elemType) {
    var buttonElem = document.createElement('button');
    buttonElem.className = elemName;
    buttonElem.title = elemTitle;
    switch (elemType) {
        case 'addlayer':
            buttonElem.addEventListener('click', function () {
                document.getElementById(elemName).style.display = 'block';
            });
            return buttonElem;
        default:
            return false;
    }
};

layerTree.prototype.addBufferIcon = function (layer) {
    layer.getSource().on('change', function (evt) {
        var layerElem = document.getElementById(layer.get('id'));
        switch (evt.target.getState()) {
            case 'ready':
                layerElem.className = layerElem.className.replace(/(?:^|\s)(error|buffering)(?!\S)/g, '');
                break;
            case 'error':
                layerElem.className += ' error'
                break;
            default:
                layerElem.className += ' buffering';
                break;
        }
    });
};

layerTree.prototype.removeContent = function (element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
    return this;
};

layerTree.prototype.createOption = function (optionValue) {
    var option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    return option;
};

layerTree.prototype.checkWmsLayer = function (form) {
    form.check.disabled = true;
    var _this = this;
    this.removeContent(form.layer).removeContent(form.format);
    var url = form.server.value;
    url = /^((http)|(https))(:\/\/)/.test(url) ? url : 'http://' + url;
    form.server.value = url;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            var parser = new ol.format.WMSCapabilities();
            try {
                var capabilities = parser.read(request.responseText);
                var currentProj = _this.map.getView().getProjection().getCode();
                var crs;
                var messageText = 'Layers read successfully.';
                if (capabilities.version === '1.3.0') {
                    crs = capabilities.Capability.Layer.CRS;
                } else {
                    crs = [currentProj];
                    messageText += ' Warning! Projection compatibility could not be checked due to version mismatch (' + capabilities.version + ').';
                }
                var layers = capabilities.Capability.Layer.Layer;
                if (layers.length > 0 && crs.indexOf(currentProj) > -1) {
                    for (var i = 0; i < layers.length; i += 1) {
                        form.layer.appendChild(_this.createOption(layers[i].Name));
                    }
                    var formats = capabilities.Capability.Request.GetMap.Format;
                    for (i = 0; i < formats.length; i += 1) {
                        form.format.appendChild(_this.createOption(formats[i]));
                    }
                    _this.messages.textContent = messageText;
                }
            } catch (error) {
                _this.messages.textContent = 'Some unexpected error occurred: (' + error.message + ').';
            } finally {
                form.check.disabled = false;
            }
        } else if (request.status > 200) {
            form.check.disabled = false;
        }
    };
    url = /\?/.test(url) ? url + '&' : url + '?';
    url = url + 'REQUEST=GetCapabilities&SERVICE=WMS';
    request.open('GET', '../../../cgi-bin/proxy.py?' + encodeURIComponent(url), true);
    //request.open('GET', url, true);
    request.send();
};

layerTree.prototype.addWmsLayer = function (form) {
    var params = {
        url: form.server.value,
        params: {
            layers: form.layer.value,
            format: form.format.value
        }
    };
    var layer;
    if (form.tiled.checked) {
        layer = new ol.layer.Tile({
            source: new ol.source.TileWMS(params),
            name: form.displayname.value
        });
    } else {
        layer = new ol.layer.Image({
            source: new ol.source.ImageWMS(params),
            name: form.displayname.value
        });
    }
    this.map.addLayer(layer);
    this.messages.textContent = 'WMS layer added successfully.';
    return this;
};

layerTree.prototype.addWfsLayer = function (form) {
    var url = form.server.value;
    url = /^((http)|(https))(:\/\/)/.test(url) ? url : 'http://' + url;
    url = /\?/.test(url) ? url + '&' : url + '?';
    var typeName = form.layer.value;
    var mapProj = this.map.getView().getProjection().getCode();
    var proj = form.projection.value || mapProj;
    var parser = new ol.format.WFS();
    var source = new ol.source.Vector({
        strategy: ol.loadingstrategy.bbox
    });
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            source.addFeatures(parser.readFeatures(request.responseText, {
                dataProjection: proj,
                featureProjection: mapProj
            }));
        }
    };
    url = url + 'SERVICE=WFS&REQUEST=GetFeature&TYPENAME=' + typeName + '&VERSION=1.1.0&SRSNAME=' + proj;
    request.open('GET', '../../../cgi-bin/proxy.py?' + encodeURIComponent(url));
    //request.open('GET', url);
    request.send();
    var layer = new ol.layer.Vector({
        source: source,
        name: form.displayname.value
    });
    this.addBufferIcon(layer);
    this.map.addLayer(layer);
    this.messages.textContent = 'WFS layer added successfully.';
    return this;
};



//---------------------------Geojson Funktionalitäten-----------------------------------------------------------------
layerTree.prototype.addVectorLayer = function (form) {
    var file = form.file.files[0];
    //console.log(file.name)
    var currentProj = this.map.getView().getProjection();
    var fr = new FileReader();
    var sourceFormat;
    var source = new ol.source.Vector();

    /*var max_x, max_y, min_x, min_y, nw, sw, no, so
    var geojson_text; 
    var extent;
    var zoompoint*/
    var center_array = []
    var center_puffer_array = []


    fr.onload = function (evt) {

        var vectorData = evt.target.result;
        
        /*var x_values_array = []
        var y_values_array = []
        

        var duplicate_array1 = []
        var duplicate_array2 = []*/

        //parse filereader-object-"text" --> js-object
        geojson_json = JSON.parse(vectorData)
        //check for explicit crs tag
        if ('crs' in geojson_json){
            console.log("already has crs key");
        } else {
            //console.log("has no crs key");
            geojson_json.crs = { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } };
        }

        zoompoint = geojson_json.features[0].geometry.coordinates;
        console.log(zoompoint)

// --- Hier neue Turf-Fus einbauen-----------

// Probleme beim schwaebisch-hall-datensatz und beim centro....:
// .. es bricht hier beim letzten cluster-Feature ab .. dann kommt ein turf-Fehler...

/*
Uncaught TypeError: can't assign to property 0 on 6.880123868176042: not an object
 In Strict_mode, a TypeError is raised when attempting to create a property on primitive value such as a symbol, a string, a number or a boolean. Primitive values cannot hold any property.
The problem might be that an unexpected value is flowing at an unexpected place, or that an object variant of a String or a Number is expected. 
*/
// ??? gehen auch andere Attribute?
// 2er-CLuster werden noch nicht erkannt!!!!!! 
// NEIN geht es auch anderswo?
// OK- kommt false_dummy dazu?
// OK- ist der crs-Tag dabei
//OK, geht schon mit dem HN_singled_raw.geojson - Datensatz


    //console.log(geojson_json);

    // geojson in wgs84 umwandeln, später WIEDER zurück in 3857 !!!
    var converted = turf.toWgs84(geojson_json);
    console.log(converted)

    //2m-NÄhe-Cluster erkennen
    var scanned = turf.clustersDbscan(converted,0.002)
    /*console.log("Scan-Ergebnis:" +scanned)
    for (x in scanned){
      console.log(x + ": " + scanned[x])
    }*/


    // Calculate the total number of clusters
    var total = 0
    turf.clusterEach(scanned, 'cluster', function () {
      total++;
    });
    console.log(total + ' Cluster vorhanden')

    // Iterate over each cluster
    turf.clusterEach(scanned, 'cluster', function (cluster, clusterValue, currentIndex) {
      console.log('cluster mit allen Mitgliedern: ',cluster)
      //console.log('clusterValue ',clusterValue) // zählt durch
      //console.log('currentIndex, d.h. Cluster-Nummer: ',currentIndex) // zählt durch
      // die cluster enthalten alle den Eintrag dbscan: core und cluster:0 ....
      //unterscheidbar sind sie also tatsächlich nur durch den clusterEach-Aufruf...

      // cluster-Zentroid erstellen
      cluster_center = turf.centroid(cluster)
      cluster_center_coords = cluster_center.geometry.coordinates
      console.log("cluster-center-Koordinaten: " + cluster_center_coords)

      // Gradzahl für die Bearings des clusters erstellen: 
      console.log("GRadzahl ist:" + 360/cluster.features.length + ". Also werden in folgenden Winkeln Punkte projeziert:")
      for (let ii = 0; ii < cluster.features.length; ii++){
        var gradzahl = ii*(360/cluster.features.length)
        console.log("Gradzahl: "+ gradzahl)
        console.log("... für Feature-Stelle: "+ii)
        //ABstand (ideeller Kreisradius) >= 4,25 Meter 
        var diameter = 4 + (cluster.features.length*0.125)

        var translated_coords_point = turf.transformTranslate(turf.point(cluster_center_coords), diameter, gradzahl,{units: 'meters'});
        //console.log(translated_coords_point)
        var translated_coords = translated_coords_point.geometry.coordinates
        console.log("Verschiebungs-Koords:"+translated_coords)


        for (a in converted.features){
 
          if (cluster.features[ii].id === converted.features[a].id){
            console.log("Hier die Koordinaten des converted-Ziels: "+ converted.features[a].geometry.coordinates)
            //setzen:
            converted.features[a].geometry.coordinates = translated_coords_point.geometry.coordinates
            console.log("HIer die verschobenen Koord-Werte: "+ converted.features[a].geometry.coordinates)
          }   
        }

      }
      console.log("Hallo325")
      //console.log(cluster)
      center = turf.centroid(cluster)
      //console.log(center)
      center_array.push(center)
      console.log("Hallo330")
      /*center_puffer = turf.buffer(center, 15, {
        units: 'meters',
        //Ecken-Anzahl wächst nach Cluster-Größe
        // jetzt noch die Punkte darauf verteilen
        steps: cluster.features.length 
      });*/
      //console.log("es sind "+ cluster.features.length + " Steps.")
      
      //center_puffer_array.push(center_puffer)
      /*center_puffer_line = turf.polygonToLine(center_puffer)
      center_puffer_lines_array.push(center_puffer_line)
      center_puffer_line_length = turf.length(center_puffer_line, {units: 'meters'});
      center_puffer_line_lengths_array.push(center_puffer_line_length)
      center_puffer_line_length_ratio = center_puffer_line_length / (cluster.features.length + 1)
      center_puffer_line_length_ratios_array.push(center_puffer_line_length_ratio)*/

      // multipoint erstellen
      /*
      center_puffer_line_projectpoints_gesamt_array.push(center_puffer_line_projectpoints_sammel_array)
      console.log(turf.getType(turf.multiPoint(center_puffer_line_projectpoints_sammel_array)))

      //wichtig:wieder löschen
      center_puffer_line_projectpoints_sammel_array = []
      */
      // FALLS es mit den Punkten auf dem Puffer nix wird (vl. einfach die vorhandenen Punkte ersetzen?):
      //RIchtungen für die zu projezierenden Punkte festlegen und als Punkte darstellen (und/pder auch nur die vorh. Punkte ersetzen?)

 /*     console.log("GRadzahl ist:" + 360/cluster.features.length + ". Also werden in folgenden Winkeln Punkte projeziert:")
      for (let ii = 0; ii < cluster.features.length; ii++){
        console.log(ii*(360/cluster.features.length))

      }*/
      // SO MIT DEN RICHTUNGEN MÜSSEN JETZT DIE ORIGINAL-PUNKTE AUS DEM CLUSTER ++VERSCHOBEN WERDEN ...
      // also Punkte ansprechen...(s.o.)
      // und Koordinaten austauschen, entweder durch along(buffer(centroid(cluster))) oder durch translatedPoint(feature), s.u.
      /*var translatedPoint = turf.transformTranslate(
        point, 
        5,  //distance
        35,   //direction
        {
          units:'meters',
        }
      );*/
      // ... und in ORiginal verändern....

      //-------------------------------------
      // pro cluster 1 puffer erstellen .. leider wird pro cluster-PUNKT ein puffer erstellt???!!! Das sollte nicht so sein... allerdings bleiben dann die props auf der Strecke

      //wahrscheinlich muss man das cluster aber wahrscheinlich 
      // erstmal in single-points kriegen...statt Multi
      // hat vielleicht nicht geholfen, aber dafür war das Wegnehmen der Properties in qgis wohl erfolgreich...[dafür musste man aber zunächst das var hn_zentrum =  vorher wegnehmen]... oder doch nicht?
      /*var hull = turf.concave(cluster);
      console.log(hull)
      hull_array.push(hull)*/
      //collection = turf.featureCollection(hull)
      //console.log(collection)

      /*
      var points = turf.featureCollection([
      turf.point([-63.601226, 44.642643]),
      turf.point([-63.591442, 44.651436]),
      turf.point([-63.580799, 44.648749]),
      turf.point([-63.573589, 44.641788]),
      turf.point([-63.587665, 44.64533]),
      turf.point([-63.595218, 44.64765])
    ]);
    */

      //clustergroesse
      //cluster.features.length
      /*puffer = turf.buffer(cluster, 5, {
        units: 'meters',
        steps: cluster.features.length
      });
      clusterbuffer_array.push(puffer)*/
      
      /*for (x in clusterbuffer_array[0].features.properties){
        console.log(x)
      }*/

    })

    // und jetzt  converted wieder zurück transformieren:
    // (Ansicht bleibt aber aber auf converted)
    console.log("Hallo415")
    console.log(converted);
    console.log("Hallo417")

    //var reverted = turf.toMercator(converted);
    //    console.log(reverted)

// HIER IST DER FEHLER!!!
// AM MULTI/SINGLE LIEGT ES WAHRSCHEINLICH GAR NICHT?
//-> ALS wgs84 ausspielen versuchen, auch ohne das dummy-feature
// -> also converted ausspielen...
// daran liegt es auch nicht...
//...eigentlich geht es NUR bei HN_singled_raw richtig...
    try{
        
        
        //EIN Problem ist dass die Koordinaten in der Grundform im Doppel-Array vorliegen, 
        // Aber bei den neuberechneten Koords als einfaches Array... Ich bringe alles auf Doppel-Array-FOrm
        for (var f = 0; f < converted.features.length; f += 1) {
            //wenn im Koordinaten-Array ein Array vorliegt ...
            if (Array.isArray(converted.features[f].geometry.coordinates[0])){
                point_xy = converted.features[f].geometry.coordinates[0]
                //..  wandle sie in dieser Struktur um...
                point_xy = turf.toMercator(point_xy)
                console.log("Umgewandelte Koords eines Standard-Punkts: "+point_xy)
                //weise das array DEM OBJEKT zu - NICHT der variable point_xy, das bringt nix ...
                converted.features[f].geometry.coordinates[0] = point_xy
            //wenn eben kein Array im Array vorliegt ...
            } else {
                //... dann nimm die Koordinaten direkt...
                console.log("NEIN, kein Array... Nimm die Koordinaten direkt...")

                point_xy = converted.features[f].geometry.coordinates
                // .. wandle sie um...
                point_xy = turf.toMercator(point_xy)
                console.log("Umgewandelte Koords, leider in Einfachklammer: "+point_xy)
                // UND BILDE HIER EIN ARRAY DARUM HERUM!!!
                interim_double_array = []
                interim_double_array.push(point_xy)
                console.log("Hier die Koords in Doppelklammer: "+interim_double_array)
                //weise das array DEM OBJEKT zu - NICHT der variable point_xy, das bringt nix ...
                converted.features[f].geometry.coordinates = interim_double_array
                

            }
            
            //Punkte einzeln in 3857 rückführen:
            //point_xy = turf.toMercator(point_xy)
            
            
        //.. UND WIEDER SIND DIE UMGEWANDELTEN PUNKTE DER CLUSTER NUR IN EINEM ARRAY,
        //.. WIR BRAUCHEN ABER DOPPEL-ARRAY FÜR ALLE MULTI-PUNKTE...
        }
    }
    catch(err){
        console.log("es gabe einen Fehler:")
        console.log(err.message)
    }

    //var reverted = turf.toMercator(converted);
    //console.log(reverted)
    // das Ausspielen als geojson kommt dann im OL-Code, dort gibt es die FUnktion eh schon...:
    console.log("Hallo428")

    //was wurde in die arrays  gepusht:
   // console.log("HIer center-array:" + center_array)
    //console.log(center_puffer_array)
    /*console.log(center_puffer_lines_array)
    console.log(center_puffer_line_lengths_array)
    console.log(center_puffer_line_length_ratios_array)*/
    //bisheriger Endstand, wird nicht gescheit zum Layer:
/* ES MUSS AB ALONG NOCH EINMAL DIE INTERNE STRUKTUR GEPRÜFT WERDEN IN DER DIE FEATURE COLLECTION BIS HIER UNTEN AUFGEBAUT IST. 
Derzeitige Verschachtelung: 
{ FeatureCollection,
  FEatures 
  [
    [!!!! hier kommen sub-arrays mit Packeten zu 6 punkten, 43 Punkten etc. Aber die STruktur der Doppel-Verschachtelung bezieht sich bei Multipoint nur auf die Koordinaten. HIER MUSS KLARHEIT HER!
    {type feature,
     geometry:
      {
        type:point,
        coordinates:[
          x,y
        ]
      }
    },
    {type feature,
     geometry:
      {
        type:point,
        coordinates:[
          x,y
        ]
      }
    },
    ......





*/
    //console.log(center_puffer_line_projectpoints_gesamt_array)

    //daraus kann man einige zum Layer machen:
    //center_layer = turf.featureCollection(center_array)
    //center_puffer_layer = turf.featureCollection(center_puffer_array)


        
//------------------------------------

        console.log("Hallo524")
        //Neues Dummy-Feature am Anfang unterbringen, damit auf jeden Fall alle benötigten Attribute dabei sind, auch wenn die Spalte im Ausgangs-Datensatz nicht gefüllt war und deshalb nicht vom Server exportiert wurde
        // jetzt doch wieder mit converted statt reverted arbeiten,
        //... da die Koordinaten einzeln 
        converted.features.unshift(
        {"type":"Feature",
        "geometry":{"type":"MultiPoint","coordinates":[[1178606.24072,6010867.34820]]},
        "properties":{
            "Geprüft":0,
            "name":"False_Dummy",
            "standort_id":0,
            "stadtbezirk":"",
            "stt":"",
            "brn":99,
            "vk_gesamt":0,
            "bt":0,
            "fil":0,
            "leistungsfaehigkeit":0,
            "flaech_leist":0,
            "umsatz_gesch":0.0,
            "umsatz_mio_brutto":0.0,
            "lage":0,
            "zentr_versorgbereich":"",
            "bemerkungen":"",
            "manuelle_adresse": 0,  
            "plz": 0,
            "stadt":"",
            "str":"",
            "hsnr":0,
            "hsz":"",
            "mbu_10":0.0,
            "mbu_20":0.0,
            "mbu_30":0.0,
            "mbu_31":0.0,
            "mbu_32":0.0,
            "mbu_33":0.0,
            "mbu_40":0.0,
            "mbu_41":0.0,
            "mbu_42_43":0.0,
            "mbu_44":0.0,
            "mbu_50":0.0,
            "mbu_51_52_53":0.0,
            "mbu_54":0.0,
            "mbu_57_58":0.0,
            "mbu_59":0.0,
            "mbu_60":0.0,
            "mbu_61":0.0,
            "mbu_62":0.0,
            "mbu_63":0.0,
            "mbu_65":0.0,
            "mbu_70":0.0,
            "mbu_71":0.0,
            "mbu_72":0.0,
            "mbu_73":0.0,
            "mbu_74":0.0,
            "mbu_76":0.0,
            "mbu_77":0.0,
            "mbu_801":0.0,
            "mbu_802":0.0,
            "mbu_803":0.0,
            "mbu_81":0.0,
            "mbu_82":0.0,
            "mbu_83_84":0.0,
            "mbu_85":0.0,
            "mbu_86":0.0,
            "mbu_87":0.0,
            "baumarkt_vk_innen":0,
            "baumarkt_vk_dach_freifl":0,
            "baumarkt_vk_freifl":0,
            "hwg":0,
            "projektgebiet01":"",
            "projektgebiet02":"",
            "projektgebiet03":"",
            "erheber_prim":"",
            "erhebungszeitpunkt":"",
            "analyseart":"",
            "prim_sek":"",
            "quelle_sek":"",
            "vollerheb_teilsort":"",
            "xcoor_r":1178606.24072,
            "ycoor_r":6010867.34820,
            "zone":"",
            "ctriso":""
            },
        "id":"fid--24b7b2c7_16b999abbc4_-7c6f"})

        //console.log(geojson_json.features)
        console.log("Hallo611")
        //zurück als Text, der unten in geojson_export gepusht und dann gedownloaded wird
        geojson_text = JSON.stringify(converted);
        console.log("geojson_text is now "+ geojson_text);
        console.log("Hallo 615")
        //explicitly determine geojson format
        var sourceFormat = new ol.format.GeoJSON();
        /*switch (form.format.value) {
            case 'geojson':
                sourceFormat = new ol.format.GeoJSON();
                break;
            case 'topojson':
                sourceFormat = new ol.format.TopoJSON();
                break;
            case 'kml':
                sourceFormat = new ol.format.KML();
                break;
            case 'osm':
                sourceFormat = new ol.format.OSMXML();
                break;
            default:
                return false;
        }*/
        //explicitly determine only web mercator 
        var dataProjection = 'EPSG:3857'    //form.projection.value' || sourceFormat.readProjection(vectorData) || currentProj;
       console.log("Hallo636") 
        source.addFeatures(sourceFormat.readFeatures(geojson_text, {
        //source.addFeatures(sourceFormat.readFeatures(geojson_text, {
            dataProjection: dataProjection,
            featureProjection: currentProj
        }));
        console.log("Hallo642")
        // Download-Content ist das umgewandelte geojson-Objekt (s.o.)
        geojson_export  = geojson_text;
        //console.log("2-Innerhalb addvectorlayer und  darin filereader-onload-fu :geojson_export is now:" +geojson_export);    
        
        //hier nun auch die richtige Datenquelle angeben
        var file_start = file.name.substr(0,file.name.indexOf('.'));
        var new_filename = file_start + '_fürMapit.geojson';
        //console.log(new_filename)

        //download(new_filename, geojson_export);
        save_as(geojson_export,new_filename)
    };//-------------------------------------------------------- Ende fr.onload

    //console.log("Extent: "+extent)
    fr.readAsText(file);
    var layer = new ol.layer.Vector({
        source: source,
        name: form.displayname.value,
        strategy: ol.loadingstrategy.bbox
    });

    //console.log("Layer-Objekt: "+layer);
    this.addBufferIcon(layer);
    this.map.addLayer(layer);
    
    this.messages.textContent = 'Geojson-Datei wurde hinzugefügt.';
    
    
    //Zoom auf Layer, später mit extent -- wenn von hier aus erreichbar:
   // console.log("Extent außerhalb fr.onload-Event-Handler, innerhalb LayerTreeaddVectorLayer- fu: "+ extent)
    this.map.getView().fit([1074072.75446, 6274807.424978, 1594272.75446, 6895207.424978], this.map.getSize())

    return this;
}; // ------- Ende Fu layerTree.prototype.addVectorLayer


// Fu. muss auch innerhalb vom fr.onload stehen und  geojson_text oben definiert sein
/*function download(filename, txt) {
    //console.log("3-Innerhalb download-fu: text-variable(ausgeojson_export übernommen) is now:" +txt);                
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}*/

function save_as(content, fname){
    var blob = new Blob([content], {
        type: "text/plain;charset=utf-8"
        });
    saveAs(blob,fname)
}


function init() {
    document.removeEventListener('DOMContentLoaded', init);

    //Map-Objekt erstellen
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM(),
                name: 'BaseLayer: OpenStreetMap'
            })
            /*,
            new ol.layer.Vector({
                source: new ol.source.Vector({
                    format: new ol.format.GeoJSON({
                        defaultDataProjection: 'EPSG:4326'
                    }),
                    url: '../../res/world_capitals.geojson',
                    attributions: [
                        new ol.Attribution({
                            html: 'World Capitals © Natural Earth'
                        })
                    ]
                }),
                name: 'World Capitals'
            })*/
            ],
        controls: [
            //Define the default controls
            new ol.control.Zoom({
                target: 'toolbar'
            }),
            //Define some new controls
            new ol.control.MousePosition({
                coordinateFormat: function (coordinates) {
                    var coord_x = coordinates[0].toFixed(3);
                    var coord_y = coordinates[1].toFixed(3);
                    return coord_x + ', ' + coord_y;
                },
                target: 'coordinates'
            })
        ],
        view: new ol.View({
            center: [1174072.754460, 6574807.424978],
            //resolution: 6000,
            zoom: 6
        })
    }); // Ende Map-Objekt


    console.log(map.getLayers().array_);

    var tree = new layerTree({map: map, target: 'layertree', messages: 'messageBar'})
        .createRegistry(map.getLayers().item(0))
        //.createRegistry(map.getLayers().item(1)); // wms-Layer wegnehmen

    document.getElementById('checkwmslayer').addEventListener('click', function () {
        tree.checkWmsLayer(this.form);
    });
    document.getElementById('addwms_form').addEventListener('submit', function (evt) {
        evt.preventDefault();
        tree.addWmsLayer(this);
        this.parentNode.style.display = 'none';
    });
    document.getElementById('wmsurl').addEventListener('change', function () {
        tree.removeContent(this.form.layer)
            .removeContent(this.form.format);
    });
    document.getElementById('addwfs_form').addEventListener('submit', function (evt) {
        evt.preventDefault();
        tree.addWfsLayer(this);
        this.parentNode.style.display = 'none';
    });
    document.getElementById('addvector_form').addEventListener('submit', function (evt) {
        evt.preventDefault();
        tree.addVectorLayer(this);
        this.parentNode.style.display = 'none';
    });

    document.getElementById('fixed-div').addEventListener('click', function (evt) {
    //console.log("Juhu")
    document.getElementsByClassName('addvector')[0].click()
    });


    //Automatischer Click auf AddVectorLayer-Button
    document.getElementsByClassName('addvector')[0].click()

}//--------------------------------------------------Ende init-Fu
document.addEventListener('DOMContentLoaded', init);
