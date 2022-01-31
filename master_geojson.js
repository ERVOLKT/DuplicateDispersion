<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>GEOJSON-NACHBEARBEITUNG</title>
        <link href="ol.css" rel="stylesheet">
        <link href="master_geojson.css" rel="stylesheet">
        <script type="text/javascript" src="ol-debug.js"></script>
        <script type="text/javascript" src="FileSaver.js"></script>
        <script type="text/javascript" src="turf_geojson.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js"></script>
        <!--<script src="https://cdnjs.cloudflare.com/ajax/libs/Turf.js/5.1.6/turf.js"></script>-->
        
    </head>
    <body>
        <div class="map-container">
            <div id="toolbar" class="toolbar"></div>
            <div id="layertree" class="layertree"></div>
            <div id="map" class="map"></div>
            <div id="fixed-div">
                    <h4>Geojson hinzufügen</h4>
            </div>
            <div class="notification-bar">
                <div id="messageBar" class="message-bar"></div>
                <div id="coordinates"></div>
            </div>
        </div>
        <div id="addwms" class="toggleable" style="display: none;">
            <form id="addwms_form" class="addlayer">
                <p>Add WMS layer</p>
                <table>
                    <tr>
                        <td>Server URL:</td>
                        <td><input id="wmsurl" name="server" type="text" required="required" value="http://demo.opengeo.org/geoserver/wms"></td>
                        <td><input id="checkwmslayer" name="check" type="button" value="Check for layers"></td>
                    </tr>
                    <tr>
                        <td>Layer name:</td>
                        <td><select name="layer" required="required"></select></td>
                    </tr>
                    <tr>
                        <td>Display name:</td>
                        <td><input name="displayname" type="text"></td>
                    </tr>
                    <tr>
                        <td>Format:</td>
                        <td><select name="format" required="required"></select></td>
                    </tr>
                    <tr>
                        <td>Tiled:</td>
                        <td><input type="checkbox" name="tiled"></td>
                    </tr>
                    <tr>
                        <td><input type="submit" value="Add layer"></td>
                        <td><input type="button" value="Cancel" onclick="this.form.parentNode.style.display = 'none'"></td>
                    </tr>
                </table>
            </form>
        </div>
        <div id="addwfs" class="toggleable" style="display: none;">
            <form id="addwfs_form" class="addlayer">
                <p>Add WFS layer</p>
                <table>
                    <tr>
                        <td>Server URL:</td>
                        <td><input name="server" type="text" required="required" value="http://demo.mapserver.org/cgi-bin/wfs"></td>
                    </tr>
                    <tr>
                        <td>Layer name:</td>
                        <td><input name="layer" type="text" required="required" value="cities"></td>
                    </tr>
                    <tr>
                        <td>Display name:</td>
                        <td><input name="displayname" type="text"></td>
                    </tr>
                    <tr>
                        <td>Projection:</td>
                        <td><input name="projection" type="text" value="EPSG:4326"></td>
                    </tr>
                    <tr>
                        <td><input type="submit" value="Add layer"></td>
                        <td><input type="button" value="Cancel" onclick="this.form.parentNode.style.display = 'none'"></td>
                    </tr>
                </table>
            </form>
        </div>
<!------------------- GEojson functionality----------------------------------------------------------->
        <div id="addvector" class="toggleable" style="display: none;">
            <form id="addvector_form" class="addlayer">
                <p>GeoJSON- Datei auswählen: </p>
                <table>
                    <tr>
                        <td>Geojson-Datei:</td>
                        <td><input name="file" type="file" required="required"></td>
                    </tr>
                    <tr>
                        <td>Anzeigename:</td>
                        <td><input name="displayname" type="text"></td>
                    </tr>
                    <!--<tr>
                        <td>Format:</td>
                        <td><select name="format" required="required">
                            <option value="geojson">GeoJSON</option>
                            <option value="topojson">TopoJSON</option>
                            <option value="kml">KML</option>
                            <option value="osm">OSM</option>
                        </select></td>
                    </tr>-->
                    <!--<tr>
                        <td>Projection:</td>
                        <td><input name="projection" type="text"></td>
                    </tr>-->
                    <tr>
                        <td><input type="submit" value="Hinzufügen"></td>
                        <td><input type="button" value="Abbruch" onclick="this.form.parentNode.style.display = 'none'"></td>
                    </tr>
                </table>
            </form>
        </div>
    </body>
</html>
