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
        mapped_data = new Map(Array.from(data, d => [d.county_fips, (({ county, county_full, state_name, population }) => ({ county, county_full, state_name, population }))(d)]))
        tot = 0
        moss = 0
        data.forEach(d => {
            const key = d.county.toLowerCase().replace(/[^a-zA-Z]+/g, '');            
            if (!name_to_fips.has(key)) {
                name_to_fips.set(key, [d.county_fips]);
            } else {
                name_to_fips.get(key).push(d.county_fips)
            }
            moss += 1
            tot += parseInt(d.population)
        });
        console.log(tot)
        console.log(moss)
        us = await res.json();

        const width = 1200;
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
            .attr("stroke", "white")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 0.3)
            .attr("cursor", "pointer")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .join("path")
            .on("click", clicked)
            .on("mouseover", hover)
            .on("mouseout", function (event, d) {
                tooltip.style("opacity", 0);
                d3.select(this).transition()
                        .style("opacity", 1)
            })
            .attr("d", path);

        counties_array = counties._groups[0];
        
        g.append("path")
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 1.2)
            .attr("stroke-linejoin", "round")
            .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));
        
        
        let tooltip = svg.append("g")
            .style("opacity", 0)
            .style("pointer-events", "none")
            .style("position", "absolute")

        let tooltip_rect = tooltip.append("rect")
            .attr("fill", "red")
            .style("stroke", "black")

        let tooltip_text = tooltip.append("text")
            .attr("text-anchor", "middle")
            .attr("fill", "white");

        svg.call(zoom);

        function reset() {
            counties.transition()
                .style("stroke", "white")
                .attr("stroke-width", 0.3);
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
            counties.transition().style("stroke", "white").attr("stroke-width", 0.3);
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
            d3.select(this).raise();
        }

        function zoomed(event) {
            const {transform} = event;
            g.attr("transform", transform);
            g.attr("stroke-width", 1 / transform.k);
        }

        function hover(event, d) {
            this_county = d3.select(this)
            this_county.transition()
                .style("opacity", 0.4)
            zoom_dim = d3.zoomTransform(svg.node())
            mapped_data_county = mapped_data.get(d.id)
            tooltip_text.selectAll("tspan").remove();
            if (named_counties.has(mapped_data_county.county.toLowerCase().replace(/[^a-zA-Z]+/g, ''))) {
                const [[x0, y0], [x1, y1]] = path.bounds(d);
                squared_amt = Math.sqrt(zoom_dim.k)
                box_width =  128 * squared_amt
                box_height = 70 * squared_amt
                tooltip_rect
                    .attr("width", box_width)
                    .attr("height", box_height)
                    .attr("rx", 5 * squared_amt)
                    .attr("ry", 5 * squared_amt)
                    .attr("stroke-width", 1 + (squared_amt));
                tooltip
                    .style("opacity", 0.8)
                    .attr("transform", `translate(${event.offsetX}, ${event.offsetY - 50})`);
                tooltip_text
                    .attr("font-size", 8 * Math.sqrt(zoom_dim.k))
                    .append("tspan")
                    .text(`County: ${mapped_data_county.county_full}`)
                    .attr("y", box_height * 1/4)
                    .attr("x", box_width / 2)
                    .append("tspan")
                    .text(`State: ${mapped_data_county.state_name}`)
                    .attr("y", box_height * 2/4)
                    .attr("x", box_width / 2)
                    .append("tspan")
                    .text(`Population: ${mapped_data_county.population.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}`)
                    .attr("y", box_height * 3/4)
                    .attr("x", box_width / 2)
            }
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
        total_pop += parseInt(mapped_data.get(d.__data__.id).population)
        total_counties += 1
        d3.select(d).transition()
            .style("fill", "red");
    }
    named_counties.set(input, d_list)

    document.getElementById("counties_named").innerHTML = total_counties.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,&thinsp;");
    document.getElementById("total_population").innerHTML = total_pop.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,&thinsp;");

    document.getElementById("input_bar").value = "";
}

fetchJSONData()