
function init() {

    document.removeEventListener('DOMContentLoaded', init);

    //nachdem init-fu verankert wurde, ist der Input auch im Javascript erreichbar
	el = document.getElementById('file_input');
	if(el){
	  el.addEventListener('change', upload, false);
	  //alert("Existiert")
	} else {
		console.log("HTML-Input-Element [file_input] existiert nicht")
	}

	//-- info-label rechts unten
	var infoLabel = document.createElement('span');
    infoLabel.className = 'info-label';
    infoLabel.textContent = 'i';

	//-----------------Open Layers Map erstellen
    var map = new ol.Map({
	    target: 'map',
	    layers: [
	        new ol.layer.Tile({source: new ol.source.Stamen({layer: 'terrain'})})
	        /*new ol.layer.Tile({source: new ol.source.OSM()})
	        ,vectorLayer*/
	    ],
	    controls: [
	        //Define the default controls
	        new ol.control.Zoom(),
	        new ol.control.Rotate(),
	        new ol.control.Attribution({
	            label: infoLabel
	        }),
	        //Define some new controls
	        new ol.control.ZoomSlider(),
	        new ol.control.MousePosition({
	            coordinateFormat: function (coordinates) {
	                var coord_x = coordinates[0].toFixed(3);
	                var coord_y = coordinates[1].toFixed(3);
	                return coord_x + ', ' + coord_y;
	            }
	        }),
	        /*new ol.control.ScaleLine({
	            units: 'meters'
	        })
	        ,
	        new ol.control.OverviewMap({
	            collapsible: false
	        })*/
	    ],
	   /* interactions: ol.interaction.defaults().extend([
	        new ol.interaction.Select({
	            layers: [vectorLayer]
	        })
	    ]),*/
	    view: new ol.View({
	        center: [1174072.754460, 6574807.424978],
	        zoom: 6.5
	    })
	});

	function upload(evt) {
	  
		var tab_daten = null;
		//HTML5 filereader
		var file = evt.target.files[0];

		//neuen Dateinamen kreieren und in process- sowie dann in saveas-Fus mitgeben...
		var file_start = file.name.substr(0,file.name.indexOf('.'));
    	var new_filename = file_start + '_fürWebGIS.csv';
    	
		var reader = new FileReader();
		reader.readAsText(file);

		reader.onload = function(event) {
			document.getElementById('info_div').innerHTML = ""
			document.getElementById('info_div').innerHTML += "<p> Lese CSV-Datei......</p>"
			var csvData = event.target.result;
			 
			var tab_daten = Papa.parse(csvData, 
				{
					header : true
					//, dynamicTyping: true
				}
			);

			//console.log(tab_daten);
			console.log("Csv hat "+tab_daten.data.length + " Zeilen. Das Trennzeichen ist ein: '"+ tab_daten.meta.delimiter + "'. Die Spalten heißen: "+ tab_daten.meta.fields + ".")
			//return tab_daten; 
			

			
			// Hauptfunktion aufrufen
			process(tab_daten, new_filename)	// --> Neue 2.Fu innerhalb dieser aufrufen, die auf gleicher Ebene existiert
		};
		reader.onerror = function() {
			document.getElementById('info_div').innerHTML += ('<p> Kann die Datei nicht lesen: ' + file.fileName + ' </p>');
		};

	} // ----------------------------------------------------- Ende Funktion upload

	//Haupt-fu process----------------------------------------------------------
	function process(csv_tab, neuer_dateiname){
		document.getElementById('info_div').innerHTML += "<p>Verarbeite CSV-Datei....</p>"
		var zellenobjekt = csv_tab.data

	// #########  Syntax-Setup für Tabellenchecks  ###############
		//Eine Spalte einer Zeile
		//console.log(zellenobjekt[0].standort_id)
		
		//Spalten einer Zeile
		/*for (var spalte in zellenobjekt[0]){
			console.log(spalte)
		}*/

		//Alle Zeilen 
		/*for (var zeilen_nr in zellenobjekt){
			console.log(zellenobjekt[zeilen_nr]);
		}*/

		// Spaltenwerte für eine Spalte aller Zeilen
		/*for (var zeilen_nr in zellenobjekt){
			spalte_namen = zellenobjekt[zeilen_nr].name
			console.log(spalte_namen);
		}*/

		// Alle Spalten aller Zeilen
		/*for (var zeilen_nr in zellenobjekt){
			//spalte_standort_id = zellenobjekt[zeilen_nr].standort_id
			//console.log(spalte_standort_id);
			for (var attribut_name in zellenobjekt[zeilen_nr]){
				var zellen_wert = zellenobjekt[zeilen_nr][attribut_name]
			}
		}*/
		
		//Features als Layer der Map hinzufügen
		display_features(zellenobjekt)


		//check auf Spalten: muss_spalten-Array gibt die zu suchenden Spalten vor. 
			//Die Differenz wird in array fehlende_spalten gepusht und automatisch darüber angelegt.
		var muss_spalten = ["ctriso", "name", "prim_sek","quelle_sek","brn","bt","hwg","vk_gesamt","lage","erhebungszeitpunkt","standort_id","leistungsfaehigkeit","mbu_10","mbu_20","mbu_30","mbu_31","mbu_32","mbu_33","mbu_40","mbu_41","mbu_42_43","mbu_44","mbu_50","mbu_51_52_53","mbu_54","mbu_57_58","mbu_59","mbu_60","mbu_61","mbu_62","mbu_63","mbu_65","mbu_70","mbu_71","mbu_72","mbu_73","mbu_74","mbu_76","mbu_77","mbu_801","mbu_802","mbu_803","mbu_81","mbu_82","mbu_83_84","mbu_85","mbu_86","mbu_87", "X", "Y", "xcoor_r","ycoor_r","changed","pictureFolder","pictureName","picturePath","created","altitude","accuracy", "vollerheb_teilsort", "plz", "stadt", "stt", "str", "hsnr" , "hsz", "flaech_leist", "umsatz_mio_brutto", "baumarkt_vk_innen", "umsatz_mio_brutto", "baumarkt_vk_dach_freifl", "baumarkt_vk_freifl", "erheber_prim", "fil", "bemerkungen" , "projektgebiet01", "manuelle_adresse", "addr_revgc_locked"]
		
		var fehlende_spalten = []
		
		//console.log(zellenobjekt[0])
		for (var such_nr in muss_spalten){ //stimmt
			//console.log(muss_spalten[such_nr]);	// stimmt
			
			// Verlgeich mit 1. Zeile im Zellenobjekt:
							//Suchsyntax für strings in arrays:         array.find(function(array) {return array == suchwert;});
							// ABER auf der Zeilenebene liegt keine Array vor, sondern ein einfaches OBJEKT , d.h. einfachere Syntax
			if (muss_spalten[such_nr] in zellenobjekt[0]){
				//console.log("it is true!")
			} else {
				console.log("Attribut "+ muss_spalten[such_nr]+ " ist nicht in csv-Datei vorhanden und wird vorgemerkt.")
				fehlende_spalten.push(muss_spalten[such_nr])
			}
		}

		if (fehlende_spalten.length > 0){
			console.log("---------------- Fehlende Spalten werden angelegt : " +fehlende_spalten);

			//dynamisch leere Spalten anlegen
			for (var zeilen_nr in zellenobjekt){
				
				for (var anlege_spalte in fehlende_spalten){
					zellenobjekt[zeilen_nr][fehlende_spalten[anlege_spalte]] = ''	
				}
			}
		}


		// Umsatzberechnung
				// wenn vk und flcähenleistung schonmal in der 1. Zeile vorhaden sind ist gut...
		if(('vk_gesamt', 'flaech_leist') in zellenobjekt[0]){		
			//alert('hhoray both!')
			for (var zeilen_nr in zellenobjekt){
				flächenleistung = zellenobjekt[zeilen_nr].flaech_leist
				//console.log(flächenleistung);
				verkaufsfläche = zellenobjekt[zeilen_nr].vk_gesamt
				if (!(parseInt(flächenleistung)  <= 1) || !(parseInt(verkaufsfläche) <= 1)){
				//$umsatz_mio_neu = ([int]$Zeile."vk_gesamt" * [int]$Zeile."flaech_leist" / 1000000) 
	            var umsatz_mio_neu = parseInt(verkaufsfläche) * parseInt(flächenleistung) / 1000000
				//console.log("Bisheriger Eintrag bei Umsatz: "+zellenobjekt[zeilen_nr].umsatz_mio_brutto +".Berechne Umsatz...")
				zellenobjekt[zeilen_nr].umsatz_mio_brutto = umsatz_mio_neu;
				//console.log("Errechneter Umsatz: "+zellenobjekt[zeilen_nr].umsatz_mio_brutto)
				}
				else {
					console.log("flächenleistung oder VK kleinergleich 1. Umsatz für Eintrag  '"+zellenobjekt[zeilen_nr].name+"' nicht berechnet.")
				}
			}
		} else{
			console.log("vk_gesamt oder flaech_leist oder beide waren nciht in 1. Zeile vorhanden")
		} 

		// Einträge aus manuelle_adresse in addr_revgc_locked kopieren
		if(('addr_revgc_locked', 'manuelle_adresse') in zellenobjekt[0]){		
			//console.log('Felder addr_revgc_locked und manuelle_adresse vorhanden')
			for (var zeilen_no in zellenobjekt){
				zellenobjekt[zeilen_no].addr_revgc_locked = zellenobjekt[zeilen_no].manuelle_adresse
				//console.log(flächenleistung);
				}
		} else{
			console.log("!!Felder addr_revgc_locked oder manuelle_adresse oder beide waren nciht (in 1. Zeile) vorhanden!!!")
		} 

	
		/*	
		//...hatte zum Spalten-Einfügen funktioniert,
		//	...allerdings nur für den Export über Papa.unparse(csv_tab), 
		//	... war so im zellenobjekt nicht log-bar und schien deshalb nicht zu funktionieren
		//	... jetzt wird ohnehin Papa.unparse(zellenobjekt) verwendet
		for (field in fehlende_spalten){	
			//csv_tab.meta.fields.push('leistungsfaehigkeit');
			console.log("Füge Attribut "+ fehlende_spalten[field] + " ein.")
			// so kommen die Felder zur Meta-Spalten-Übersicht, aber nicht zum Objekt selbst
			csv_tab.meta.fields.push(fehlende_spalten[field]);	
			//console.log(csv_tab.meta.fields);
			// Einfügen in alle Zeilen inkl Null- oder Leerwert geht nicht... wo liegt der Denkfehler?
			for (row in zellenobjekt){
				row[fehlende_spalten[field]] = '';
			}
		}
		*/

		
		//console.log(zellenobjekt[0])
			

	// --------------Attribute-Check:-----------------------------------------------------------------------------------------------------------------------------------------  

		var ort_proj1 = []
		var stadtteil_proj1 = []
		var plz_proj1 = []
		var projektgebiet01_proj1 = []
		var proj1_fill = []

		for (var zeilen_nr in zellenobjekt){
			//spalte_standort_id = zellenobjekt[zeilen_nr].standort_id
			//console.log(spalte_standort_id);
			
			// ----------Riesenschleife, die durch alle Zellen iteriert:------------------------------------------------------------------------
			for (var attribut_name in zellenobjekt[zeilen_nr]){

				// LEse-Syntax für einzelne Zellen:
				var zellen_wert = zellenobjekt[zeilen_nr][attribut_name]
				// aber SCHREIBEN geht mit DIESER SYNTAX, sonst läuft es ins Leere!!!!!!!!!!!!!!!:
					// zellenobjekt[zeilen_nr].Attributname = 'veränderter Wert'

				// ALLE SPALTEN JEDER ZEILE  -1 -> null ersetzen, AUßER bei Standort-ID > (muss vor den Stadnort-ID-Änderungen stehen [hier ins else gepackt]...) 
				if (attribut_name !== 'standort_id'){	
					if (zellen_wert === '-1'){
						console.log("Wert -1 bei Objekt-Nummer "+ zeilen_nr + " (Name: '" + zellenobjekt[zeilen_nr].name+ "')  ,  Spalte [" + attribut_name + "] entdeckt. Wird auf 0 gesetzt")
						zellenobjekt[zeilen_nr][attribut_name] = '';
						console.log("Neuer Wert für "+zellenobjekt[zeilen_nr].name+ "[" +attribut_name+ "]: "+zellen_wert)
					}else {}
				} else {	//Standort_ID 0 oder leer -> Standort_ID 1 / Standort-ID 1 -> -1				
					//console.log("Attributname ist Standort-ID.: "+ attribut_name)
					if (zellen_wert === '' || zellen_wert === '0' || zellen_wert === '1'){
						console.log("standort-id bei Betrieb '"+ zellenobjekt[zeilen_nr].name +"'(Name) ist 0, 1 oder leer: "+zellen_wert+ ". Wird auf -1 gesetzt:")
						zellenobjekt[zeilen_nr].standort_id = '-1'
						console.log("Standort-ID ist jetzt: "+ zellen_wert)
					}
				}

				// bestimme hwg aus brn
				// und 0 ausschließen wg. dropdown-domain
				if (attribut_name === 'brn'){	// brn kommt als string an - ich setze hwg trotzdem sicherheitshalber als int
					if (zellen_wert == 0 ){
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("habe 0 / NULL in brn. Erstelle BNR 10 und HWG 11")
						//console.log("hwg ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].hwg))
						zellenobjekt[zeilen_nr].brn = 11
            zellenobjekt[zeilen_nr].hwg = 10
						//console.log(zellenobjekt[zeilen_nr].hwg + "(" +typeof(zellenobjekt[zeilen_nr].hwg)+ ")")
					} 
					else if (zellen_wert > 0 && zellen_wert < 10){
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("habe EH 1-9 in brn. Erstelle BNR 10 und HWG 11")
						//console.log("hwg ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].hwg))
						zellenobjekt[zeilen_nr].brn = 11
            zellenobjekt[zeilen_nr].hwg = 10
						//console.log(zellenobjekt[zeilen_nr].hwg + "(" +typeof(zellenobjekt[zeilen_nr].hwg)+ ")")
					} 
					else if (zellen_wert >= 10 && zellen_wert < 20){
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						//console.log("habe EH in brn. Erstelle HWG 10")
						//console.log("hwg ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].hwg))
						zellenobjekt[zeilen_nr].hwg = 10
						//console.log(zellenobjekt[zeilen_nr].hwg + "(" +typeof(zellenobjekt[zeilen_nr].hwg)+ ")")
					} 
					else if (zellen_wert >= 20 && zellen_wert < 30){
						zellenobjekt[zeilen_nr].hwg = 20
						//console.log("habe 20er in brn. Erstelle HWG 20")
					}
					else if (zellen_wert >= 30 && zellen_wert < 40){
						zellenobjekt[zeilen_nr].hwg = 30
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 30")
					}
					else if (zellen_wert >= 40 && zellen_wert < 50){
						zellenobjekt[zeilen_nr].hwg = 40
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 40")
					}
					else if (zellen_wert >= 50 && zellen_wert < 60){
						zellenobjekt[zeilen_nr].hwg = 50
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 50")
					}
					else if (zellen_wert >= 60 && zellen_wert < 70){
						zellenobjekt[zeilen_nr].hwg = 60
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 60")
					}
					else if (zellen_wert >= 70 && zellen_wert < 80){
						zellenobjekt[zeilen_nr].hwg = 70
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 70")
					}
					else if (zellen_wert >= 80 && zellen_wert < 83 ){
						zellenobjekt[zeilen_nr].hwg = 801
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 801")
					}
					else if (zellen_wert >= 83 && zellen_wert < 85 ){
						zellenobjekt[zeilen_nr].hwg = 802
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 802")
					}
					else if (zellen_wert >= 85 && zellen_wert < 88 ){
						zellenobjekt[zeilen_nr].hwg = 803
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 803")
					}
					else if (zellen_wert >= 88 && zellen_wert < 90 ){
						zellenobjekt[zeilen_nr].hwg = null
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 99")
					}
					else if (zellen_wert >= 90 && zellen_wert < 100 ){
						zellenobjekt[zeilen_nr].hwg = 99
						//console.log("habe "+zellen_wert+" in brn. Erstelle HWG 99")
					}
					else if (zellen_wert >= 100 && zellen_wert < 801 ){
						zellenobjekt[zeilen_nr].brn = 11
            zellenobjekt[zeilen_nr].hwg = 10
						console.log("habe "+zellen_wert+" in brn. Erstelle BRN 11 und HWG 10")
					}
					else {
						console.log("!!!!!!!!BRN hat unvorhergesehenen Wert. Setze BRN 11 und HWG 10: "+zellen_wert)
            zellenobjekt[zeilen_nr].brn = 11
            zellenobjekt[zeilen_nr].hwg = 10
					}
				}

				// leeres Erheberfeld füllen
				if (attribut_name === 'erheber_prim'){	
					if (zellen_wert == '' ){
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("erheber_prim war leer. Setze GMA")
						//console.log("hwg ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].hwg))
						zellenobjekt[zeilen_nr].erheber_prim = 'GMA_GIS'
						//console.log(zellenobjekt[zeilen_nr].hwg + "(" +typeof(zellenobjekt[zeilen_nr].hwg)+ ")")
					} 
				}

				//fil 0 ausschließen wg. dropdown-domain - > wird, wenn 0/NULL, jetzt standardmäßig 1 gesetzt...
				if (attribut_name === 'fil'){	
					if (zellen_wert == 0 ){
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("habe  0 in fil. Erstelle fil 1")
						//console.log("fil ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].fil))
						zellenobjekt[zeilen_nr].fil = 1
						//console.log(zellenobjekt[zeilen_nr].fil + "(" +typeof(zellenobjekt[zeilen_nr].fil)+ ")")
					}
          else if (zellen_wert == 1 ){
            //gewünschter Wert; Nichts tun.
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
          }
          else if (zellen_wert == 2 ){
						//gewünschter Wert; Nichts tun.
            //console.log(typeof(zellen_wert) +": "+ zellen_wert)
          }
          else {
						console.log("!!!!!!!!FIL hat unvorhergesehenen Wert. Setze FIL=1: "+zellen_wert)
            zellenobjekt[zeilen_nr].fil = 1
					}
          
				}
        // Lage abfangen -> wird bei 0/NULL und größergleich 5 auf 1 gesetzt
        if (attribut_name === 'lage'){	
					if (zellen_wert == 0 ){//gilt auch für NULL
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("habe  0 oder NULL in Lage Erstelle Lage 1")
						//console.log("lage ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].lage))
						zellenobjekt[zeilen_nr].lage = 1
						//console.log(zellenobjekt[zeilen_nr].lage + "(" +typeof(zellenobjekt[zeilen_nr].lage)+ ")")
					}
          else if (zellen_wert >= 5){
            console.log("habe  5 oder größer in Lage Erstelle Lage 1")
            zellenobjekt[zeilen_nr].lage = 1
          }
          else {
						console.log("!!!!!!!!Lage hat unvorhergesehenen Wert: "+zellen_wert)
					}
				}
        
        // leistungsfaehigkeit abfangen -> wird bei 0 / NULL und >6 auf 3 gesetzt
        if (attribut_name === 'leistungsfaehigkeit'){	
					if (zellen_wert == 0 ){//gilt auch für NULL
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("habe  0 oder NULL in leistungsfaehigkeit Erstelle leistungsfaehigkeit 3")
						//console.log("leistungsfaehigkeit ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].leistungsfaehigkeit))
						zellenobjekt[zeilen_nr].leistungsfaehigkeit = 3
						//console.log(zellenobjekt[zeilen_nr].leistungsfaehigkeit + "(" +typeof(zellenobjekt[zeilen_nr].leistungsfaehigkeit)+ ")")
					}
          else if (zellen_wert >= 6){
            console.log("habe  6 oder größer in Lage Erstelle leistungsfaehigkeit 3")
            zellenobjekt[zeilen_nr].leistungsfaehigkeit = 3
          }
          else {
						console.log("!!!!!!!!leistungsfaehigkeit hat unvorhergesehenen Wert: "+zellen_wert)
					}
				}
        
        // bt abfangen -> wird bei 0/NULL auf 3 gesetzt, und bei >=8 auf 2
        if (attribut_name === 'bt'){	
					if (zellen_wert == 0 ){//gilt auch für NULL
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("habe bt 0 oder NULL in bt Erstelle bt 3")
						//console.log("bt ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].bt))
						zellenobjekt[zeilen_nr].bt = 3
						//console.log(zellenobjekt[zeilen_nr].bt + "(" +typeof(zellenobjekt[zeilen_nr].bt)+ ")")
					}
          else if (zellen_wert >= 8){
            console.log("habe bt 7 oder größer in bt Erstelle bt 2")
            zellenobjekt[zeilen_nr].bt = 2
          }
          else {
						console.log("!!!!!!!!bt hat unvorhergesehenen Wert: "+zellen_wert)
					}
				}
        
        if (attribut_name === 'analyseart'){	
					if (zellen_wert == 0 ){//gilt auch für NULL
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("habe analyseart 0 oder NULL in analyseart Erstelle analyseart  Erhebung")
						//console.log("analyseart ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].analyseart))
						zellenobjekt[zeilen_nr].analyseart = 'Erhebung'
						//console.log(zellenobjekt[zeilen_nr].analyseart + "(" +typeof(zellenobjekt[zeilen_nr].analyseart)+ ")")
					}
          else if (zellen_wert == 'AA'){
            //console.log("erwünschter WErt. Nichts zu tun.")
          }
          else if (zellen_wert == 'Daten'){
            //console.log("erwünschter WErt. Nichts zu tun.")
          }
          else if (zellen_wert == 'EHK'){
            //console.log("erwünschter WErt. Nichts zu tun.")
          }
          else if (zellen_wert == 'Erhebung'){
            //console.log("erwünschter WErt. Nichts zu tun.")
          }
          else if (zellen_wert == 'NVK'){
            //console.log("erwünschter WErt. Nichts zu tun.")
          }
          else if (zellen_wert == 'REHK'){
            //console.log("erwünschter WErt. Nichts zu tun.")
          }
          else if (zellen_wert == 'STA'){
            //console.log("erwünschter WErt. Nichts zu tun.")
          }
          else {
						console.log("!!!!!!!!analyseart hat unvorhergesehenen Wert. Setze Erhebung: "+zellen_wert)
            zellenobjekt[zeilen_nr].analyseart = 'Erhebung'
					}
				}
        
        
				//primär / sekundär WIRD JETZT IMMER AUF 'Primär' GESETZT, weil Primärdaten
				if (attribut_name === 'prim_sek'){	
					zellenobjekt[zeilen_nr].prim_sek = 'primär'
					//console.log("Spalte prim_sek  wurde auf '"+ zellenobjekt[zeilen_nr].prim_sek + "' gesetzt.")
				} 
				//Sekundärquelle WIRD JETZT IMMER AUF  'keine Sekundärdaten' GESETZT, weil Primärdaten
				if (attribut_name === 'quelle_sek'){	
					zellenobjekt[zeilen_nr].quelle_sek = 'keine Sekundärdaten'
					//console.log("Spalte quelle_sek war leer und wurde auf '"+ zellenobjekt[zeilen_nr].quelle_sek + "' gesetzt.")	
				}
				//Erhebungszeitpunkt WIRD JETZT IMMER AKTUELL GESETZT -> Kopie des Eintrags von Mapit-Systemspalte "created", allerdings nur Zeichen 1-10, ohne uhrzeit
				if (attribut_name === 'erhebungszeitpunkt'){	
					zellenobjekt[zeilen_nr].erhebungszeitpunkt = zellenobjekt[zeilen_nr].created.substring(0, 10);
					//console.log("Spalte erhebungszeitpunkt wurde auf aktuelles Datum, '"+ zellenobjekt[zeilen_nr].erhebungszeitpunkt + "' ersetzt.")	
				}

				//Leistungsfähigkeit leer -> Leistungsfühigkeit = 3
				if (attribut_name === 'leistungsfaehigkeit'){
				//console.log(leistungsfaehigkeit)	
					if (zellen_wert === ''){
						zellenobjekt[zeilen_nr].leistungsfaehigkeit = 3
						console.log("Spalte leistungsfaehigkeit war leer und wurde durch '"+ zellenobjekt[zeilen_nr].leistungsfaehigkeit + "' ersetzt.")
					}
				}
        
        //vollerheb_teilsort - > wird, wenn 0/NULL oder bei unsinnigem, jetzt standardmäßig auf Teilsortimente gesetzt...
				if (attribut_name === 'vollerheb_teilsort'){	
					if (zellen_wert == 0 ){
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
						console.log("habe  0 in vollerheb_teilsort. Erstelle Eintrag Teilsortimente")
						console.log("vollerheb_teilsort ist vorher Datentyp: "+ typeof(zellenobjekt[zeilen_nr].vollerheb_teilsort))
						zellenobjekt[zeilen_nr].vollerheb_teilsort = 'Teilsortimente'
						console.log(zellenobjekt[zeilen_nr].vollerheb_teilsort + "(" +typeof(zellenobjekt[zeilen_nr].vollerheb_teilsort)+ ")")
					}
          else if (zellen_wert == 'Vollerhebung' ){
            //gewünschter Wert; Nichts tun.
						//console.log(typeof(zellen_wert) +": "+ zellen_wert)
          }
          else if (zellen_wert == 'Teilsortimente' ){
						//gewünschter Wert; Nichts tun.
            //console.log(typeof(zellen_wert) +": "+ zellen_wert)
          }
          else {
						console.log("!!!!!!!!vollerheb_teilsort hat unvorhergesehenen Wert: "+zellen_wert)
            console.log("Setze  Teilsortimente als Wert")
            zellenobjekt[zeilen_nr].vollerheb_teilsort = 'Teilsortimente'
					}  
				}

				// INT-Garantie : Hausnummern, plz [...] und ReverseGeocoding-Feinjustierungsfeld als integer statt real oder string garantieren
				if (attribut_name === 'hsnr' || attribut_name === 'plz' || attribut_name === 'addr_revgc_locked' ){					// || attribut_adresse === 'manuelle_eingabe'
					if (typeof(zellen_wert) === 'string'){
						//console.log("ist string")
						zellenobjekt[zeilen_nr][attribut_name] = parseInt(zellen_wert,10)
						//console.log("Attribut "+ attribut_name + " ist " + typeof(zellen_wert) + ", "+ zellen_wert) // vl. noch Nummern-anbieter anzeigen
					} else {
						console.log(attribut_name + " ist KEIN String!")
					}
				}

				// leere mbu-spalten oder Wert -1 auf 0 setzen
				if (attribut_name.includes('mbu_')){	
					//console.log(typeof(zellen_wert) + "- Type mbu-spalte gefunden. ")
					if (zellen_wert === '-1' || zellen_wert === ''){
						console.log("MBU-Wert war [" + zellenobjekt[zeilen_nr][attribut_name] + "].")
						zellenobjekt[zeilen_nr][attribut_name] = '0'	
						console.log("MBU_wert wurde auf [" + zellenobjekt[zeilen_nr][attribut_name] + "] gesetzt."	 )
					}
				}

				// Sonderzeichen, insb. , / \ ? : ; in Namens- und Bemerkungsspalte ersetzen, CAVE SYNTAX
				//ersetzt hoffentlich nur "innerhalb" des Werts, ncith die String-Anführungszeichen darum
				// -> zum Glück radiert die Erfassungs-App selbst schon ungewollte Anführungszeichen aus...
				//	--> PapaParse automatismus:
						//--> Anführungszeichen innerhalb Zelle werden als doppelte AnfZeichen gesetzt (eigentlich richtig, nur xcel und webgis lesen das falsch(?))
						//--> gesamter Zellinhalt im Fall von Sonderzeichen wird auch in doppelte AnfZeichen gesetzt: 
						// --> Z1[Treff ,:;"„'`´ 3000] -> ["Treff ,:;""„'`´ 3000"]
									//--> Excel macht daraus ( mit , als sep und " als quote) [Treff ,:] und schneidet danach die Zeile ab!
						//--> im Fall von z999[/  \ ;: ?] wird aber nix in Anfzeichen gesetzt... -> [/  \ ;: ?] 
									// -> Excel macht daraus (mit , als sep und " als quote) [/  \ ] und schneidet danach die Zeile ab!
				if (attribut_name === 'name' || attribut_name === 'bemerkungen' || attribut_name === 'zentr_versorgbereich'){
					//richtige Syntax für Ersetzung -- MIT führendem "zellen_wert ="  , nur "zellen_wert.replace(" führt zu nichts....
					//console.log("Bei Zeile "+ zeilen_nr + " Vorher: " + zellen_wert)
					zellenobjekt[zeilen_nr][attribut_name] = zellen_wert.replace(/[,:;"„'`´/\\]/g, '_')		//mittlere Ersetzung; minimal: (/[,:;„`´/\\]/g, '_') maximal: (/[,:;"„'`´?!#-/\\]/g, '_')
					//console.log("Bei Zeile "+ zeilen_nr + " Nachher: " + zellen_wert)
				}

				//Stadt-Einträge für Projektgebiet im ort_proj1-array sammeln:
				if (attribut_name === 'stadt'){	
					if (zellen_wert === ''){
					}
					else{	
						ort_proj1.push(zellen_wert)
					}
				}

				//Stadtteil-Einträge als Fallback1 für Projektgebiet im array sammeln:
				if (attribut_name === 'stt'){	
					if (zellen_wert === ''){
					}
					else{	
						stadtteil_proj1.push(zellen_wert)
					}
				}

				//PLZ-Einträge als Fallback2 für Projektgebiet im array sammeln:
				if (attribut_name === 'plz'){	
					if (zellen_wert === 0){
					}
					else{	
						plz_proj1.push(zellen_wert.toString())
					}
				}
				//Proj1-Einträge als Fallback3 für Projektgebiet im -array sammeln:
				if (attribut_name === 'projektgebiet01'){	
					if (zellen_wert === ''){
					}
					else{	
						projektgebiet01_proj1.push(zellen_wert)
					}
				}



				//--toB Continued


			} // ---------------------- Ende Riesen-Check-Schleife

			// -----------------Projektgebiet-automatisch-füllen vorbereiten-----------
			//console.log(ort_proj1);
			//console.log(stadtteil_proj1);
			//console.log(plz_proj1);
			//console.log(projektgebiet01_proj1);
			var proj1_start = ''
			var heute = new Date();
			var tagesdatum = heute.getFullYear()+'-'+(heute.getMonth()+1)+'-'+heute.getDate()
			//console.log(tagesdatum)

			//häufigste Nennung eines Substrings in einem array
			function longest_common_starting_substring(arr1){
				//console.log("arr1: " + arr1);
				var arr= arr1.concat().sort(),
				a1= arr[0], a2= arr[arr.length-1], L= a1.length, i= 0;
				while(i< L && a1.charAt(i)=== a2.charAt(i)) i++;
				return a1.substring(0, i);
			}

			//Projektgebiet-Anfang inklusive Fallbacks vorbereiten
			if (ort_proj1.length > 0){
				//console.log("ort_proj1 " +longest_common_starting_substring(ort_proj1))
				proj1_start = longest_common_starting_substring(ort_proj1)	
			} else {
				if (stadtteil_proj1.length > 0) {
					console.log("stadtteil_proj1 " +longest_common_starting_substring(stadtteil_proj1))
					proj1_start = longest_common_starting_substring(stadtteil_proj1)
				} 
				else {
					if (plz_proj1.length > 0) {
						console.log("plz_proj1 "+ longest_common_starting_substring(plz_proj1))
						proj1_start = longest_common_starting_substring(plz_proj1)
					} else {
							if (projektgebiet01_proj1.length > 0) {
								console.log("projektgebiet01_proj1 " + longest_common_starting_substring(projektgebiet01_proj1))
								proj1_start = longest_common_starting_substring(projektgebiet01_proj1)
						} else {
							proj1_start = 'Erhebung'
						}	
					}
				}
			}

			// Zufallswerte für fehlende Ortsangaben
			if (proj1_start === ''){
				var zu_fall = Math.random().toString(36).substring(7);
				proj1_start= zu_fall
			}
			//console.log("proj1_start:  " + proj1_start)
			
			//proj1_fill-array für Füllung vorbereiten
			proj1_fill.push(proj1_start + '_' + tagesdatum)
			


		} //---------------------Ende Attribute-Check-SChleife
		
		//Projektgebiet einsetzen
			//letzten Wert aus projfill-array nehmen und 
			// als Projektgebiet01 einiterieren, weil Auswahl durch longest_common_substr-Fu hier nicht griff...
			// Eintrag weiter unten auch für Nutzer sichtbar ausgeben.
			//console.log(proj1_fill)

		var letzter_eintrag = proj1_fill[proj1_fill.length-1]
		console.log("letzter Eintrag: " +letzter_eintrag);

		for (var zeilen_nr in zellenobjekt){
			zellenobjekt[zeilen_nr].projektgebiet01 = letzter_eintrag
			//zellenobjekt[zeilen_nr].projektgebiet01 = longest_common_starting_substring(proj1_fill)
		}


		/*
					if (proj1_start === ''){
				var zu_fall = Math.random().toString(36).substring(7);
				proj1_start = zu_fall
				console.log("Zufallswert", zu_fall);
			}
			*/


		//Matching: Spaltenumbenennungen: Koordinaten aus aktuellen mobilen Werten für X und Y, die zu xcoor_r und ycoor_r werden
		//(xcoor_r->xcoor_OLD | x -> xcoor_r & ycoor_r->ycoor_OLD | y -> ycoor_r) 

		for (var zeilen_nr in zellenobjekt){
			//console.log("xcoor_r vorher: " +zellenobjekt[zeilen_nr].xcoor_r)
			zellenobjekt[zeilen_nr].xcoor_OLD = zellenobjekt[zeilen_nr].xcoor_r
			//console.log("xcoor_OLD aus xcoor_r nachher: " +zellenobjekt[zeilen_nr].xcoor_OLD)
			delete zellenobjekt[zeilen_nr].xcoor_r
			zellenobjekt[zeilen_nr].xcoor_r = zellenobjekt[zeilen_nr].X
			//console.log("xcoor_r aus x nachher: " +zellenobjekt[zeilen_nr].xcoor_r)
			
			zellenobjekt[zeilen_nr].ycoor_OLD = zellenobjekt[zeilen_nr].ycoor_r
			delete zellenobjekt[zeilen_nr].ycoor_r
			zellenobjekt[zeilen_nr].ycoor_r = zellenobjekt[zeilen_nr].Y
			
		}	//geht .. nicht wundern, mobile Erfassung liefert nur zwei Nachkomma-Stellen, Server jedoch mehr...


		//console.log(zellenobjekt)

		//durch unparse entstehen leider falsche Kommawerte in Hsnr / plz statt int 
			//...  später manuell mit FaR ändern (.0) falls es nciht schon weiter oben mit INT-Garantie abgefangen wurde
		var back_to_string = Papa.unparse(zellenobjekt
		/*, 
			{
				quotes: true, 
				quoteChar: '"',
				delimiter: ','
			}
		*/
		)	

		document.getElementById('info_div').innerHTML += "<p>Speichere veränderte CSV-Datei...</p>"

		//Falls das INT-Garantieren weiter oben nicht funktioniert, muss man wieder über diesen Weg im unparse-Ergebnis "back_to_string" alle hoffentlich falschen double-Werte (Hsnr etc) ersetzen 
			// ... als pre_save speichern und weitergeben
		//var pre_save = back_to_string.replace(/(\.0,)/g, ',')	// Achtung: Punkt escapen! + Syntax  "variable = string.replace(" , s.o. bei Sonderzeichen
		//save_as(pre_save, neuer_dateiname)	// statt save_as(back_to_string, neuer_dateiname)	
	
		save_as(back_to_string, neuer_dateiname)
		// Projektgebiet-Eintrag anzeigen
		document.getElementById('info_div').innerHTML += "<p>Nach dem Upload ist der Datensatz über diesen Projektgebiet01-Eintrag filterbar :<h3><b> " + letzter_eintrag + " </b></h3> "
	} // -------------------Ende Funktion process
	

	function save_as (content,fname){

   //save_as(geojson_export, new_filename)
	   //var content = "What's up , hello world";
	    // any kind of extension (.txt,.cpp,.cs,.bat)
	    //var filename = "hello.geojson";
	    var blob = new Blob([content], {
	        type: "text/plain;charset=utf-8"
	    });
	    saveAs(blob, fname); 
	}//---------------------Ende Fu SaveAs


	function display_features(input_features){
		document.getElementById('info_div').innerHTML += '<p>Füge Standorte der Karte hinzu...</p>'
		//console.log(input_features)

		//feature array
		var points_array = []

		for (var zeilen_nr in input_features){
			var point_feature = new ol.Feature({ });
			if (input_features[zeilen_nr].name === 'False_Dummy'){
				// nix, d.h. False_Dummy-Feature zählt nicht zur Layer, auf die gezoomt wird
		} else {	
			var point_geom = new ol.geom.Point([input_features[zeilen_nr].X, input_features[zeilen_nr].Y]);
			point_feature.setGeometry(point_geom)
			points_array.push(point_feature)
			}
		}

		var vector_layer = new ol.layer.Vector({
			source: new ol.source.Vector({
		    features: points_array
		  })
		})
		map.addLayer(vector_layer);

		var layer_extent = vector_layer.getSource().getExtent();
		map.getView().fit(layer_extent, map.getSize())

	}//-------------------- Ende Fu display_features
} // ---------------Ende init-fu
document.addEventListener('DOMContentLoaded', init);
