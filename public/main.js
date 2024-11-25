let us
let curr
let mapped_data
let name_to_fips = new Map();
var total_pop = 0
var total_counties = 0
let named_counties = new Map()
let counties_array
let input


async function fetchJSONData() {
    try {
        let [res, data] = await Promise.all([fetch("./data/counties-albers-10m.json"),
            d3.csv("./data/uscounties.csv")]);
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        mapped_data = new Map(Array.from(data, d => [d.county_fips, (({ county, state_name, population }) => ({ county, state_name, population }))(d)]))
        data.forEach(d => {
            // Remove all non-alpha characters and convert string to lowercase
            const key = d.county.toLowerCase().replace(/[^a-zA-Z]+/g, '');            
            if (!name_to_fips.has(key)) {
                name_to_fips.set(key, [d.county_fips]);
            } else {
                name_to_fips.get(key).push(d.county_fips)
            }
        });
        us = await res.json();

        const width = 1000;
        const height = 1000;

        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", zoomed);

        const svg = d3.select("#map")
            .attr("width", width)
            .attr("height", height);

        const path = d3.geoPath();

        const g = svg.append("g");

        counties = g.append("g")
            .attr("fill", "#444")
            .attr("cursor", "pointer")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .join("path")
            .on("click", clicked)
            .on("mouseover", hover)
            .attr("d", path);

        counties_array = counties._groups[0];
        
        // Outline states
        g.append("path")
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 1.2)
            .attr("stroke-linejoin", "round")
            .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));
        
        // Outline counties
        g.append("path")
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 0.3)
            .attr("stroke-linejoin", "round")
            .attr("d", path(topojson.mesh(us, us.objects.counties, (a, b) => a !== b)));

        svg.call(zoom);

        function reset() {
            counties.transition().style("stroke", null);
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity,
                d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
            );
        }

        function clicked(event, d) {
            if (curr === d.id) {
                curr = null
                reset();
                return;
            } else {
                curr = d.id
            }

            const [[x0, y0], [x1, y1]] = path.bounds(d);
            event.stopPropagation();
            counties.transition().style("stroke", null);
            d3.select(this).transition()
                .style("stroke", "blue")
                .attr("stroke-width", 1.5);
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
                d3.pointer(event, svg.node())
            );
        }

        function zoomed(event) {
            const {transform} = event;
            g.attr("transform", transform);
            g.attr("stroke-width", 1 / transform.k);
        }

        function hover(event, d) {
        }

    } catch (error) {
        console.error("Error fetching JSON data:", error);
    }
}

function submit() {
    input = document.getElementById("input_bar").value.toLowerCase().replace(/[^a-zA-Z]+/g, '');
    document.getElementById("Error").innerHTML = "<br/>";
    if (named_counties.has(input)) {
        document.getElementById("Error").innerHTML = `"${document.getElementById("input_bar").value}" has already been named`;
        return;
    }
    if (!name_to_fips.has(input)) {
        document.getElementById("Error").innerHTML = `"${document.getElementById("input_bar").value}" is not a county`;
        return;
    }
    fips = name_to_fips.get(input)
    d_list = counties_array.filter((d) => fips.includes(d.__data__.id))
    for (const d of d_list) {
        console.log(mapped_data.get(d.__data__.id))
        total_pop += parseInt(mapped_data.get(d.__data__.id).population)
        total_counties += 1
        d3.select(d).transition()
            .style("fill", "red")
            .attr("stroke-width", 1.5);
    }

    document.getElementById("counties_named").innerHTML = total_counties.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,&thinsp;");
    document.getElementById("total_population").innerHTML = total_pop.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,&thinsp;");

    document.getElementById("input_bar").value = "";
}

fetchJSONData()