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

    var max_x, max_y, min_x, min_y, nw, sw, no, so
    var geojson_text; 
    var extent;
    var zoompoint


    fr.onload = function (evt) {

        var vectorData = evt.target.result;
        
        var x_values_array = []
        var y_values_array = []
        

        var duplicate_array1 = []
        var duplicate_array2 = []
	//vorbereitend auf neue Verschiebung
	var near_not_same_array = []
	var abstand = 0.0
	var duplicate_verschiebe_array1 = []
	var duplicate_verschiebe_array2 = []

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


// Räumlicher Vergleich und Duplikat_Veränderung / Schlangengenerierung
      
        //FÜr jedes Feature die Koordinaten auslesen ...: x_value | y_value
        for (x in geojson_json.features){
           // ...x-Werte...
           var x_value = geojson_json.features[x].geometry.coordinates[0][0]
           // ... y-Werte...
           var y_value = geojson_json.features[x].geometry.coordinates[0][1]
       //... dann das X-Wert-Array zum X-Wert-Vergleich und für Bounds füllen ...
           x_values_array.push(x_value);    
       // ... und das y-Wert-Array füllen, aber nur für Bounds ...
           y_values_array.push(y_value);    
        }
       
      
    //... aus den Maximal- X - und Y-Werten den Extent / die Bounds basteln ...
        //Syntax: Math.max.apply(Math, array) !!!!!!!!!!!!!!!!!

        max_x = Math.max.apply(Math,x_values_array) 
        //console.log("max_x: "+max_x)               
        min_x = Math.min.apply(Math,x_values_array) 
        //console.log("min_x: "+min_x)
        max_y = Math.max.apply(Math,y_values_array) 
        //console.log("max_y: "+max_y)
        min_y = Math.min.apply(Math,y_values_array) 
        //console.log("min_y: "+min_y)

        extent = [min_x.toString(), min_y.toString(), max_x.toString(), max_y.toString()] // to String?
        //console.log("Extent z270: "+extent)
        //NUN MUSS MAN DEN EXTENT AUS DIESER FUNKTION HERAUSBRINGEN --> IM GLOBAL SCOPE ERREICHBAR
        
        //------------------------------------------------------Äußere geojson-Schleife
        //... FÜr jedes Feature die Koordinaten neu auslesen ...: xx_value | yy_value ...
        for (xx in geojson_json.features){
            var xx_value = geojson_json.features[xx].geometry.coordinates[0][0]
            //console.log("xx_value: "+xx_value);
            var yy_value = geojson_json.features[xx].geometry.coordinates[0][1]
            //console.log("yy_value: "+yy_value);
 
            //--------------------------------Vergleichsschleife im Array
            //Für jeden Eintrag der ins Array gepushten x-Werte Vergleich mit  jew. Features-xx-Wert   
            for (xxx in x_values_array){    
                //console.log(xxx);
              
                // Korrekte Abstandsberechnung
                //Math.sqrt((Math.pow(point.x-this.x,2))+(Math.pow(point.y-this.y,2)))
                var abstand = Math.sqrt((Math.pow(xx_value-x_values_array[xxx],2))+(Math.pow(yy_value-y_values_array[xxx],2)))
                //console.log(xx_value)
                //console.log(x_values_array[xxx])
                  
                //console.log(yy_value)
                //console.log(y_values_array[xxx])
                //console.log("Abstand: " + abstand + " m.")
              // --------------------------------------if passige X-Koordinatenwerte  
              //... Wenn x-Koordinate in features = x-Koordinate in x-Array....
                if (xx_value === x_values_array[xxx] ){       
                    //console.log("Gleiche Koordinaten:  + "xx + " vs "+xxx)



/* FUnktion um alle Stellen eines WErtes in einem Array zu kriegen : Bisher wird nur einer aufgenommen bei ["var d2pos_in_d1 = duplicate_array1.indexOf(xxx)"]
function getAllIndexes(arr, val) {
	var indexes = [], i;
	for(i = 0; i < arr.length; i++)
	if (arr[i] === val)
              indexes.push(i);
              return indexes;
          }
var d2pos_in_d1  = getAllIndexes(duplicate_array1, xxx);
*/

/*
			
var dispersion_y = verlaengerung1.y
geojson_json.features[xxxx].geometry.coordinates[0][1] = dispersion_y;
console.log("y nachher: " + geojson_json.features[xxxx].geometry.coordinates[0][1])
var dispersion = verlaengerung1.x
geojson_json.features[xxxx].geometry.coordinates[0][0] = dispersion;
console.log("x nachher: " + geojson_json.features[xxxx].geometry.coordinates[0][0])
*/

		if (xx === xxx){
			//console.log("no duplicates, same position:"+ xx +" , "+xxx)
		} else {                      //--------------------- else / also nicht gleiche Position---------------                                                      
                	var d2pos_in_d1 = duplicate_array1.indexOf(xxx)                        
                        //console.log("Gewünschte Kombi ist: XX-" +xx+" , XXX-"+xxx)                  
                        //console.log("Gefundene Kombi an Pos. "+d2pos_in_d1+" von duplicate_array1 ist "+duplicate_array1[d2pos_in_d1]+ " , "+ duplicate_array2[d2pos_in_d1])       
                        if (xx === duplicate_array2[d2pos_in_d1] && xxx === duplicate_array1[d2pos_in_d1]){                         
                                //console.log("Koordinaten-Kombi ist in umgekehrter Reihenfolge schon vorhanden und wird nicht aufgenommen(Falsche Dupletten...")      
                        } else {
                            duplicate_array1.push(xx)                                                                                       // ...ansonsten füge xx dem duplicate_array1 hinzu 
                            duplicate_array2.push(xxx)                                                                                                               //...und xxx dem duplicate_array2
                                
                        }
                        
                        //console.log(geojson_json.features[xx])
                        //console.log(geojson_json.features[xxx])
                    } //----------------------Ende else / also nicht gleiche Position---------------    
                }// ------------------------------ Ende if passige X-Koordinatenwerte ---------
                
                
                // Abstand ab 4m, aber nicht die ohne Abstand
                if(abstand > 0 && abstand < 4){
                  console.log("Abstand: "+ abstand + " m.")
                  console.log("Nahe Koordinaten: "+ xx + " vs "+xxx)
                  // notiere hier die Kombination
                  //console.log(duplicate_verschiebe_array1)
                  duplicate_verschiebe_array1.push(xx)
                  console.log("duplicate_verschiebe_array1: " +duplicate_verschiebe_array1)
                  //console.log(duplicate_verschiebe_array2)
                  duplicate_verschiebe_array2.push(xxx)
                  console.log("duplicate_verschiebe_array2: " +duplicate_verschiebe_array2)
                }
                else {
                  // nichts tun
                }
              
              
            }// ----------------------------------------Ende Vergleichsschleife im Array-----------
        }//---------------------------------- -----------------Ende äußere Geojson-Schleife------------
        //endgültige Dupletten-kombi-Array
        //console.log(duplicate_array1);
        //console.log(duplicate_array2);

        var dispersion_history = [];
        
        //--------------------------Raumkorrektur-Schleife für gleiche:
        //x-Wert um 1.75 Meter verändern: 
        for (xxxx in duplicate_array2){   // Leider wird der erste ortsgleiche Punkt auch verschoben... das sollte nicht passieren, weil er nur als xx und nciht xxx gespeichert wird (?)
            if (geojson_json.features[xxxx]){   // zur Sicherheit eingebaut, weil immer nach dem letzten Feature noch einmal angefangen wurde, 
                                                //und das Feature-Array hatte an dieser Stelle ncihts mehr. "geojson_json.features[xxxx] is undefined"... evtl. mal debuggen!!!!!!!!!!!!!!
                
                //console.log("Name:"+geojson_json.features[xxxx].properties.name)
                //console.log(geojson_json.features[xxxx].geometry.coordinates[0][0])   
                
                var dispersion = geojson_json.features[xxxx].geometry.coordinates[0][0] + 1.75
                //console.log("1.new x-value for "+ xxxx+ ": "+ dispersion)
                //Check:    
                // Merke dir die Verschiebungs-X-Werte...wenn es schon einmal dieser neue Wert avisiert wurde, dann füge noch +2.5 hinzu
                while (dispersion_history.includes(dispersion)){                         
                    //console.log("1a.value " +dispersion+ " already in dispersion-array")
                    dispersion = dispersion +2.5
                    //console.log("1b.increased x-value for  "+ xxxx +": " +dispersion)
                }
                geojson_json.features[xxxx].geometry.coordinates[0][0] = dispersion;
                dispersion_history.push(dispersion)
                //console.log("2.pushed new x-value for "+ xxxx +": "+dispersion)
                //console.log(geojson_json.features[xxxx].geometry.coordinates[0][0])
                //console.log(dispersion_history.toString())
                //console.log(geojson_json.features)
            }
        
        }//-----------------Ende Raumkorrektur-Schleife (gleiche)
        //console.log(dispersion_history.toString())
      
        // ------------------Anfang 2. Raumkorrektur-Schleife (nicht gleiche)
        
        // Verschiebefunktion entlang einer Linie um den insg.doppelten Abstand (percentage 2) udn Verschiebung
        function getPositionAlongTheLine(x1, y1, x2, y2, percentage) {
          return {x : x1 * (1.0 - percentage) + x2 * percentage, y : y1 * (1.0 - percentage) + y2 * percentage};
			  }

        
        for (xxxxx in duplicate_verschiebe_array1){
          console.log("x1 ist "+ geojson_json.features[duplicate_verschiebe_array1[xxxxx]].geometry.coordinates[0][0])
          console.log("y1 ist "+ geojson_json.features[duplicate_verschiebe_array1[xxxxx]].geometry.coordinates[0][1])
          console.log("x2 ist "+ geojson_json.features[duplicate_verschiebe_array2[xxxxx]].geometry.coordinates[0][0])
          console.log("y2 ist "+ geojson_json.features[duplicate_verschiebe_array2[xxxxx]].geometry.coordinates[0][1])
          
          // Verlängerung1 in Richtung 2 über Punkt 2 hinaus: also muss x2 verlaengerung1.x und y2 verlaengerung1.y erhalten
          var verlaengerung1 = getPositionAlongTheLine(   geojson_json.features[duplicate_verschiebe_array1[xxxxx]].geometry.coordinates[0][0], geojson_json.features[duplicate_verschiebe_array1[xxxxx]].geometry.coordinates[0][1], geojson_json.features[duplicate_verschiebe_array2[xxxxx]].geometry.coordinates[0][0], geojson_json.features[duplicate_verschiebe_array2[xxxxx]].geometry.coordinates[0][1], 
           1.5);
          console.log("Verlängerung in Richtung 2 über Punkt 2 hinaus:" + verlaengerung1.x, verlaengerung1.y);
          
          // Verlängerung2 in Richtung 1 über Punkt 1 hinaus: also muss x1 verlaengerung2.x und y1 verlaengerung2.y erhalten
          var verlaengerung2 = getPositionAlongTheLine(   geojson_json.features[duplicate_verschiebe_array2[xxxxx]].geometry.coordinates[0][0], geojson_json.features[duplicate_verschiebe_array2[xxxxx]].geometry.coordinates[0][1], 
geojson_json.features[duplicate_verschiebe_array1[xxxxx]].geometry.coordinates[0][0], geojson_json.features[duplicate_verschiebe_array1[xxxxx]].geometry.coordinates[0][1],                                                 
           1.5);
			    console.log("Verlängerung in Richtung 1 über Punkt 1 hinaus:" + verlaengerung2.x, verlaengerung2.y);
          
          // x2 -> verlaengerung1.x etc.
          geojson_json.features[duplicate_verschiebe_array2[xxxxx]].geometry.coordinates[0][0] =  verlaengerung1.x;
          geojson_json.features[duplicate_verschiebe_array2[xxxxx]].geometry.coordinates[0][1] =  verlaengerung1.y;
          geojson_json.features[duplicate_verschiebe_array1[xxxxx]].geometry.coordinates[0][0] =  verlaengerung2.x;
          geojson_json.features[duplicate_verschiebe_array1[xxxxx]].geometry.coordinates[0][1] =  verlaengerung2.y;
        }

        //Neues Dummy-Feature am Anfang unterbringen, damit auf jeden Fall alle benötigten Attribute dabei sind, auch wenn die Spalte im Ausgangs-Datensatz nicht gefüllt war und deshalb nicht vom Server exportiert wurde
        geojson_json.features.unshift(
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

        //zurück als Text, der unten in geojson_export gepusht und dann gedownloaded wird
        geojson_text = JSON.stringify(geojson_json);
        //console.log("geojson_text is now "+ geojson_text);

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
        
        source.addFeatures(sourceFormat.readFeatures(geojson_text, {
        //source.addFeatures(sourceFormat.readFeatures(geojson_text, {
            dataProjection: dataProjection,
            featureProjection: currentProj
        }));

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
    console.log("Extent außerhalb fr.onload-Event-Handler, innerhalb LayerTreeaddVectorLayer- fu: "+ extent)
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
