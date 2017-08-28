import React from 'react';
import axios from 'axios';
import { Row, Col, ProgressBar } from 'react-materialize';
import { connect } from 'react-redux';
import MapStyles from './MapStyles';
import Script from 'react-load-script';
import PropTypes from 'prop-types';
import SearchBar from './SearchBar';

import { loading, searchCity } from '../actions';

class GMap extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            center: null,
            searchCity: '',
            hasLoaded: true
        };
        this.mapCenter.bind(this);
    }

    loadMap() {
        const config = this.props.state;
        if (this.state.scriptLoaded) {
            this.setState({
                center: this.mapCenter(config.initialCenter.lat, config.initialCenter.lng)
            })
        }
        // create the map and markers after the component has
        // been rendered because we need to manipulate the DOM for Google =(
        this.map = this.createMap(config.initialCenter);
        if (config && config.markers) {
            this.markers = this.createMarkers(config.markers);
            if (config.legend) {
                this.createLegend(config.icons);
            }
        }

    }

    // clean up event listeners when component unmounts
    componentDidUnMount() {
        google.maps.event.clearListeners(map, 'click');
    }

    createLegend(icons) {
        const { legend } = this.refs;
        for (const key in icons) {
            const type = icons[key], name = type.name, icon = type.image;
            const div = document.createElement('div');
            div.innerHTML = `<img src="${icon}"> ${name}`;
            legend.appendChild(div);
        }
        this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
    }

    createMap(center) {
        const config = this.props.state;
        const mapOptions = {
            zoom: config.initialZoom,
            center: center,
        }
        if (config) {
            mapOptions.styles = MapStyles(config.colors);
            mapOptions.mapTypeId = 'terrain';
        }
        let map = new google.maps.Map(this.refs.mapCanvas, mapOptions);
        map.addListener('click', (e) => {
            this.setState({ lat: e.latLng.lat(), lng: e.latLng.lng() })
            let position = { lat: this.state.lat, lng: this.state.lng }
            this.newMarker(position)
        })
        // var autocomplete = new google.maps.places.Autocomplete(node);
        // autocomplete.bindTo('bounds', map);

        // autocomplete.addListener('place_changed', () => {
        //     const place = autocomplete.getPlace();
        //     if (!place.geometry) {
        //         return;
        //     }

        //     if (place.geometry.viewport) {
        //         map.fitBounds(place.geometry.viewport);
        //     } else {
        //         map.setCenter(place.geometry.location);
        //         map.setZoom(17);
        //     }

        //     this.setState({
        //         place: place,
        //         position: place.geometry.location
        //     })
        //     console.log('here i am')
        // })

        return map
    }

    createMarkers(markers) {

        const markersArray = markers.map((marker) => {
            const config = this.props.state,
                icon = config.icons && config.icons[marker.icon].image,
                thisMarker = this.newMarker(marker.position, icon);

            // have to define google maps event listeners here too
            // because we can't add listeners on the map until it's created
            if (marker.message) {
                thisMarker.infoWindowIsOpen = false;
                google.maps.event.addListener(thisMarker, 'click', () => this.handleMarkerClick(thisMarker, marker.message));
            }
            return thisMarker;
        })
        return markersArray;
    }

    getUserLocation() {
        this.props.loading();
        this.setState({ hasLoaded: false })
        // lets map autocenter on user's location (if the user enables it)
        // which takes a while, so the map should get rendered with the initial center first
        navigator.geolocation.getCurrentPosition((position) => {
            this.props.loading();
            this.moveMap(position.coords.latitude, position.coords.longitude, "You are here.");
        }, () => alert("Couldn't find your location"))
    }

    handleMarkerClick(marker, message) {
        if (!marker.infoWindowIsOpen) {
            marker.infoWindowIsOpen = true;
            this.newInfoWindow(marker, message);
        } else {
            marker.infoWindowIsOpen = false;
            marker.infoWindow.close();
        }
    }

    handleScriptCreate() {
        this.setState({
            scriptLoaded: false
        })
    }

    handleScriptError() {
        this.setState({
            scriptError: true
        })
    }

    handleScriptLoad() {
        this.setState({
            scriptLoaded: true
        });
        this.loadMap();
    }

    newInfoWindow(anchor, content) {
        anchor.infoWindow = new google.maps.InfoWindow({
            map: this.map,
            anchor: anchor,
            content: content
        })
        google.maps.event.addListenerOnce(anchor.infoWindow, 'closeclick', () => anchor.infoWindowIsOpen = false);
        return anchor.infoWindow;
    }

    newMarker(position, image) {
        return new google.maps.Marker({
            position: position,
            map: this.map,
            draggable: true,
            animation: google.maps.Animation.DROP,
            icon: image
        })
    }

    mapCenter(lat, lng) {
        return new google.maps.LatLng(lat, lng);
    }

    moveMap(lat, lng, message) {
        this.setState({
            center: this.mapCenter(lat, lng)
        });
        this.map.panTo(this.state.center);
        if (!this.state.hasLoaded) {
            let thisMarker = this.newMarker(this.state.center);
            this.newInfoWindow(thisMarker, message);
        }
    }

    handleChange(e) {
        this.setState({ searchCity: e.target.value })
    }

    handleSearchSubmit(e) {
        e.preventDefault();
        this.props.loading();
        this.props.searchCity(this.state.searchCity).then(res => {
            this.moveMap(this.props.state.center.lat, this.props.state.center.lng);
            this.setState({ searchCity: '' })
        })
    }


    render() {
        let url = "http://maps.googleapis.com/maps/api/js?key=AIzaSyAWa0K4pJPUraabbqexa91ToelqfKN7QNQ&libraries=places‌​"
        return (
            <div className="GMap">
                <Script
                    url={url}
                    onCreate={this.handleScriptCreate.bind(this)}
                    onError={this.handleScriptError.bind(this)}
                    onLoad={this.handleScriptLoad.bind(this)}
                />
                <div className='GMap-canvas' ref="mapCanvas"></div>
                {this.props.state.loading
                    ? <Row>
                        <Col s={12}>
                            <ProgressBar />
                        </Col>
                    </Row>
                    : null}
                <SearchBar handleChange={this.handleChange.bind(this)} handleSearchSubmit={this.handleSearchSubmit.bind(this)} searchCity={this.state.searchCity} />
                <button className="btn waves-effect waves-light z-zero" onClick={this.getUserLocation.bind(this)}>Use current Location</button>

            </div>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        state
    }
}

function mapDispatchToProps(dispatch) {
    return {
        loading: () => {
            return dispatch(loading())
        },
        searchCity: (location) => {
            return dispatch(searchCity(location))
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(GMap)