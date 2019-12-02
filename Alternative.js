/*TODO:
map.addLayer wieder zur gültigen Funktion machen
*/
function init() {
    document.removeEventListener('DOMContentLoaded', init);
//---------------------------Geojson hinzufügen (Event-Handler für Submit-Button, Parameter: Form-Attribute
    function addGeojson(form) {
        var file = form.file.files[0];
        //console.log(file.name)
        var currentProj = 'EPSG: 3857'  //map.getView().getProjection();
        var fr = new FileReader();
        var sourceFormat;
        var source = new ol.source.Vector();

        var max_x, max_y, min_x, min_y, nw, sw, no, so
        var geojson_text; 
        var zoompoint

        fr.onload = function (evt) {

            var vectorData = evt.target.result;
            
            var x_values_array = []
            var y_values_array = []
            

            var duplicate_array1 = []
            var duplicate_array2 = []

            //JSON verarbeiten, crs-Tag einfügen
            //parse filereader-object-"text" --> js-object
            geojson_json = JSON.parse(vectorData)
            //check for explicit crs tag
            if ('crs' in geojson_json){
                console.log("already has crs key");
            } else {
                //console.log("has no crs key");
                geojson_json.crs = { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } };
            }
   
        // Räumlicher Vergleich /  Duplikat_Veränderung und Extentberechnung
            // xvalues-array-Füllschleife

            for (x in geojson_json.features){
               var x_value = geojson_json.features[x].geometry.coordinates[0][0]
               var y_value = geojson_json.features[x].geometry.coordinates[0][1]
               x_values_array.push(x_value);    //zuerst ein X-Wert-Array zum X-Wert-Vergleich schaffen, und für Bounds
               y_values_array.push(y_value);    // und y-Wert-Array, aber nur für Bounds
            }

            //Manuelle Extentberechnung
            //Math.max.apply(Math, array) !!!!!!!!!!!!!!!!!

            max_x = Math.max.apply(Math,x_values_array) 
            console.log("max_x: "+max_x)               
            min_x = Math.min.apply(Math,x_values_array) 
            console.log("min_x: "+min_x)
            max_y = Math.max.apply(Math,y_values_array) 
            console.log("max_y: "+max_y)
            min_y = Math.min.apply(Math,y_values_array) 
            console.log("min_y: "+min_y)

            var extent = [min_x.toString(), min_y.toString(), max_x.toString(), max_y.toString()] // to String?
            console.log("Extent z70: "+extent)
            fit_map(extent)

        //NUN MUSS MAN DEN EXTENT AUS DIESER FUNKTION HERAUSBRINGEN, SODASS ER IM GLOBAL SCOPE LESBAR IST!!!!!!!!
            
            //Koordinaten-Check-Schleife : Features vs. xvalues-array
            for (xx in geojson_json.features){
                var xx_value = geojson_json.features[xx].geometry.coordinates[0][0]
                //console.log("xx_value: "+xx_value);

                for (xxx in x_values_array){    //Vergleich der Features-x-Werte  mit in Array gepushten x-Werten
                    //console.log(xxx);
                    if (xx_value === x_values_array[xxx] ){         //Wenn x-Koordinate in features = x-Koordinate in x-Array....
                        //console.log(xx + " vs "+xxx)
                        if (xx === xxx){                                                // Wenn die Position von x-Koordinate in features = Position von X-Koordinate in x-array
                                                                                        //Mache nichts...
                            //console.log("no duplicates, same position:"+ xx +" , "+xxx)
                        } else {                                                        //Wenn die Position von x-Koordinate in features und X-Koordinate in x-array sich unterscheidet....
                            var d2pos_in_d1 = duplicate_array1.indexOf(xxx)                         //... dann finde die Position vom xxx-Wert(!) in duplicate_array1
                            //console.log("Gewünschte Kombi ist: XX-" +xx+" , XXX-"+xxx)                  
                            //console.log("Gefundene Kombi an Pos. "+d2pos_in_d1+" von duplicate_array1 ist "+duplicate_array1[d2pos_in_d1]+ " , "+ duplicate_array2[d2pos_in_d1])       
                            if (xx === duplicate_array2[d2pos_in_d1] && xxx === duplicate_array1[d2pos_in_d1]){                         //   .... wenn der xx-Wert(!) im duplicate_array2 an DIESER Stelle vorkommt
                                //console.log("Koordinaten-Kombi ist in umgekehrter Reihenfolge schon vorhanden und wird nicht aufgenommen(Falsche Dupletten...")   //... tue nichts...    
                            } else {
                                duplicate_array1.push(xx)                                                                                       // ...ansonsten füge xx dem duplicate_array1 hinzu 
                                duplicate_array2.push(xxx)                                                                                                               //...und xxx dem duplicate_array2        
                                }
                            //console.log(geojson_json.features[xx])
                            //console.log(geojson_json.features[xxx])
                        }    
                    }
                }
            } //--------------------Ende Koordinaten-Check-Schleife
            //endgültige Dupletten-kombi-Array
            //console.log(duplicate_array1);
            //console.log(duplicate_array2);

            var dispersion_history = [];
            
            //Räumliche Verschiebung per Schleife: im richtigen Fall um 1 Meter  
            for (xxxx in duplicate_array2){   
                // Leider wird der erste ortsgleiche Punkt auch verschoben... das sollte nicht passieren, weil er nur als xx und nciht xxx gespeichert wird (?)
                if (geojson_json.features[xxxx]){   
                    // zur Sicherheit eingebaut, weil immer nach dem letzten Feature noch einmal angefangen wurde, 
                    //und das Feature-Array hatte an dieser Stelle ncihts mehr. "geojson_json.features[xxxx] is undefined"... evtl. mal debuggen!!!!!!!!!!!!!!
                  
                    //console.log(geojson_json.features[xx])
                    //console.log(geojson_json.features[xxx])
                    //console.log("Name:"+geojson_json.features[xxxx].properties.name)
                    //console.log(geojson_json.features[xxxx].geometry.coordinates[0][0])   
                    
                    var dispersion = geojson_json.features[xxxx].geometry.coordinates[0][0] + 1.0
                    //console.log("1.new x-value for "+ xxxx+ ": "+ dispersion)
                    //Check:    
                    // Merke dir die Verschiebungs-X-Werte...wenn es schon einmal dieser neue Wert avisiert wurde, dann füge noch +1 hinzu
                    while (dispersion_history.includes(dispersion)){                         
                        //console.log("1a.value " +dispersion+ " already in dispersion-array")
                        dispersion = dispersion +1.0
                        //console.log("1b.increased x-value for  "+ xxxx +": " +dispersion)
                    }
                    geojson_json.features[xxxx].geometry.coordinates[0][0] = dispersion;
                    dispersion_history.push(dispersion)
                    //console.log("2.pushed new x-value for "+ xxxx +": "+dispersion)
                    //console.log(geojson_json.features[xxxx].geometry.coordinates[0][0])
                    //console.log(dispersion_history.toString())
                    //console.log(geojson_json.features)
                } 
            
            }//--------------------------Ende räumliche-Verschiebungs-Schleife

            //console.log(dispersion_history.toString())
            

            //Neues Dummy-Feature am Anfang unterbringen
            geojson_json.features.unshift(
                {"type":"Feature",
                "geometry":{"type":"MultiPoint","coordinates":[[1178606.24072,6010867.34820]]},
                "properties":{
                    "name":"False_Dummy",
                    "standort_id":0,
                    "addr_revgc_locked": 0,
                    "plz":0,"stadt":"",
                    "stadtbezirk":"",
                    "stt":"","str":"",
                    "hsnr":0,"hsz":"",
                    "lage":0,
                    "vk_gesamt":0,
                    "brn":99,
                    "bt":0,
                    "fil":0,
                    "hwg":0,
                    "leistungsfaehigkeit":"",
                    "flaech_leist":0,
                    "umsatz_mio_brutto":0.0,
                    "bemerkungen":"",
                    "zentr_versorgbereich":"",
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
                    "xcoor_r":1178606.24072,
                    "ycoor_r":6010867.34820,
                    "projektgebiet01":"",
                    "projektgebiet02":"",
                    "projektgebiet03":"",
                    "analyseart":"",
                    "prim_sek":"",
                    "quelle_sek":"",
                    "vollerheb_teilsort":"",
                    "zone":"",
                    "ctriso":"",
                    "umsatz_gesch":0.0,
                    "erheber_prim":"",
                    "erhebungszeitpunkt":""
                    },
                "id":"fid--24b7b2c7_16b999abbc4_-7c6f"}
            )

            //console.log(geojson_json.features)

            //zurück als Text, der unten in geojson_export gepusht und dann gedownloaded wird
            geojson_text = JSON.stringify(geojson_json);
            //console.log("geojson_text is now "+ geojson_text);


            sourceFormat = new ol.format.GeoJSON();

            //explicitly determine only web mercator
            var dataProjection = 'EPSG:3857'    //form.projection.value' || sourceFormat.readProjection(vectorData) || currentProj;
            source.addFeatures(sourceFormat.readFeatures(geojson_text, {
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
            download(new_filename, geojson_export);
        };    // ------------------------------------------------- Ende Filreader.ONLOAD-EventHandler

        
        fr.readAsText(file);
        var layer = new ol.layer.Vector({
            source: source,
            name: file.name,
            strategy: ol.loadingstrategy.bbox
        });

        //console.log("Layer-Objekt: "+layer);
        
        // Layer hinzufügen
        map.addLayer(layer);

        //map.getView().fit(global_extent, map.getSize())

        //return this;  //windows-objekt ... um ??? zu ???
    }; // ----------------------------------------------------------- Ende Fu addgeojson

    // Zoom to layer
    function fit_map(extent_input){
        map.getView().fit(extent_input, map.getSize())
    }

    //download-function
    function download(filename, txt) {
        //console.log("3-Innerhalb download-fu: text-variable(ausgeojson_export übernommen) is now:" +txt);                
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    // map object
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM(),
                name: 'OpenStreetMap'
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
    });


    //console.log("Map-Layers-array:"+map.getLayers().array_[2]);

    //  EventListener for Submit-Button & EventHandler-> Add Geojson with the form+ its attributes as parameter
    document.getElementById('addvector_form').addEventListener('submit', function (evt) {
        evt.preventDefault();
        addGeojson(this);
        //this.parentNode.style.display = 'none';
    });
    //document.getElementsByClassName('addlayer').submit()
  
}   //--------------------------------------------Ende init- closure Fu
document.addEventListener('DOMContentLoaded', init);
