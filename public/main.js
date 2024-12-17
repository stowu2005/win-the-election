let us
let curr
let mapped_data
let name_to_fips = new Map();
var total_pop = 0
var total_counties = 0
let named_counties = new Map()
let counties_array
let input
let outline_map


async function fetchJSONData() {
    try {
        let [res, data] = await Promise.all([fetch("./data/counties-albers-10m.json"),
            d3.csv("./data/uscounties.csv")]);
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        mapped_data = new Map(Array.from(data, d => [d.county_fips, (({ county, county_full, state_name, population }) => ({ county, county_full, state_name, population }))(d)]))
        data.forEach(d => {
            const key = d.county.toLowerCase().replace(/[^a-zA-Z]+/g, '');            
            if (!name_to_fips.has(key)) {
                name_to_fips.set(key, [d.county_fips]);
            } else {
                name_to_fips.get(key).push(d.county_fips)
            }
        });
        us = await res.json();

        const width = 1200;
        const height = 1000;

        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", zoomed);

        const svg = d3.select("#map")
            .attr("width", "72vw")
            .attr("height", "60vw")
            .attr('viewBox',`-100 0 ${width} ${height}`)
            .attr('preserveAspectRatio', "xMidYMid meet");

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

        outline = g.append("g")
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 0)
            .attr("cursor", "pointer")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .join("path")
            .attr("d", path);
        outline_array = outline._groups[0]

        outline_map = new Map(outline_array.map((d) => [d.__data__.id, d]))

        barchart(0, 3142, "#bar-chart", "Number of counties guessed", "Number of counties remaining")
        barchart(0, 331092220, "#pop-chart", "Total population of counties guessed", "Population remaining")
        
        
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
            outline.transition()
                .attr("stroke-width", 0);
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
            outline.transition().attr("stroke-width", 0);
            state_outline = outline_map.get(d.id)
            d3.select(state_outline).transition()
                .attr("stroke-width", 1.5);

            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
                d3.pointer(event, svg.node())
            );
            d3.select(state_outline).raise();
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
    barchart(total_counties, 3142, "#bar-chart", "Number of counties guessed", "Number of counties remaining")
    barchart(total_pop, 331092220, "#pop-chart", "Total population of counties guessed", "Population remaining")


    document.getElementById("counties_named").innerHTML = total_counties.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    document.getElementById("total_population").innerHTML = total_pop.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    document.getElementById("input_bar").value = "";
}

fetchJSONData()



function barchart(percentage, total_percentage, bar_chart, label1, label2) {
    rest_of_bar = (total_percentage - percentage)
    const chart = d3.select(`${bar_chart}`);
    chart.selectAll('*').remove();
    county_percentage = (100 * percentage/total_percentage).toFixed(2)
    
    const x = d3.scaleLinear()
        .domain([0, total_percentage])
        .range([0, 2000]);

    const svg = chart.append('svg')
        .attr('width', `40vw`)
        .attr('height', "2vw")
        .attr('viewBox',`0 0 2000 100`)
        .attr('preserveAspectRatio', "xMidYMid meet")
        .style('position', 'absolute')
        .style('border-radius', '25px')
        .style('left', '30vw');
    
    chart.append('div')
        .attr('class', 'vl')
        .style('position', 'absolute')
        .style('left', '50vw');

    let tooltip = chart
        .append("div")
        .attr('class', 'bartooltip')

    const data = [
        { label: `${label1}`, value: percentage, left: 0, color: 'red', percentage: `(${county_percentage}\%)`},
        { label: `${label2}`, value: rest_of_bar, left: percentage, color: '#444', percentage: `(${100 - county_percentage}\%)`}, 
    ];

    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x(d.left))
        .attr('width', (d) => x(d.value))
        .attr('height', 100)
        .attr('fill', (d) => d.color)
        .on("mouseenter", function (event, d) {
            if (d.value != 0) {            
                tooltip
                    .style("opacity", 0.8)
                    .style("background-color", d.color)
                tooltip.html(
                        `<b>${(d.label)}:</b> ${(d.value.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"))} ${d.percentage}<br/>`
                        )
            }
    }).on("mousemove", function (event) {
        tooltip.style('top', (event.pageY - 20) + 'px')
            .style('left', (event.pageX + 10) + 'px');
    }).on("mouseout", function () {
        tooltip.style("opacity", 0);
    });
    return
  }