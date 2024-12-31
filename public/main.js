let us
let curr = null
let mapped_data
let name_to_fips = new Map();
var total_pop = 0
var total_counties = 0
let named_counties = new Map()
let counties_array
let counties
let input
let outline_map
let states_map
let states
let prev_named_counties = []
let state_totals = new Map()
let state_population_gotten = new Map()
let named_states = new Map()
let state_electoral_votes
let total_electoral_votes = 0
let curr_state = null
let map_tooltip
let checked = true
let won = false
let finished = false
let color = "red"
let colorMap = new Map([
    ["red", "rgba(255, 0, 0, 0.4)"], 
    ["blue", "rgba(0, 0, 255, 0.4)"],
    ["green", "rgba(0, 255, 0, 0.4)"],
    ["purple", "rgba(128, 0, 128, 0.4)"],
    ["orange", "rgba(255, 165, 0, 0.4)"],
    ])
let colorSelection = false


async function fetchJSONData() {
    try {
        let [res, data, state_data] = await Promise.all([fetch("./data/counties-albers-10m.json"),
            d3.csv("./data/uscounties.csv"), d3.csv("./data/votecount.csv")]);
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        state_electoral_votes = new Map(Array.from(state_data, d => [d.state, parseInt(d.num_votes)]))
        mapped_data = new Map(Array.from(data, d => [d.county_fips, (({ county, county_full, state_name, population }) => ({ county, county_full, state_name, population }))(d)]))
        data.forEach(d => {
            const key = d.county.toLowerCase().replace(/[^a-zA-Z]+/g, '');            
            if (!name_to_fips.has(key)) {
                name_to_fips.set(key, [d.county_fips]);
            } else {
                name_to_fips.get(key).push(d.county_fips)
            }
            if (!state_totals.has(d.state_name)) {
                state_population_gotten.set(d.state_name, 0)
                state_totals.set(d.state_name, parseInt(d.population))
            } else {
                state_totals.set(d.state_name, state_totals.get(d.state_name) + parseInt(d.population))
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
            .attr("height", "37vw")
            .attr('viewBox',`-100 -190 ${width} ${height}`)
            .attr('preserveAspectRatio', "xMidYMid slice");

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
            .on("mouseenter", function(event, d) {
                hover(event, d, d3.select(this))
            })
            .on("mousemove", function (event, d) {
                map_tooltip.style('top', (event.pageY - 60) + 'px')
                .style('left', (event.pageX + 10) + 'px');
            })
            .on("mouseout", function (event, d) {
                map_tooltip.style("opacity", 0);
                d3.select(this)
                        .style("opacity", 1)
            })
            .attr("d", path);

        counties_array = counties._groups[0];

        
        states = g.append("g")
            .selectAll("path")
            .data(topojson.feature(us, us.objects.states).features)
            .join("path")
            .attr("d", path)
            .style("pointer-events", "none")
            .style("fill", "none")
            .style("opacity", 0.2);
        
        g.append("path")
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 1.2)
            .attr("stroke-linejoin", "round")
            .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));

        const states_array = states._groups[0]
        states_map = new Map(states_array.map((d) => [d.__data__.properties.name, d]))

        const outline = g.append("g")
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 0)
            .attr("cursor", "pointer")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .join("path")
            .attr("d", path)
            .on("click", clicked)
            .on("mouseenter", function(event, d) {
                hover(event, d, d3.select(counties_array.filter((d_) => d_.__data__.id === d.id)[0]))
            })
            .on("mousemove", function (event, d) {
                map_tooltip.style('top', (event.pageY - 60) + 'px')
                .style('left', (event.pageX + 10) + 'px');
            })
            .on("mouseout", function (event, d) {
                map_tooltip.style("opacity", 0);
                d3.select(counties_array.filter((d_) => d_.__data__.id === d.id)[0])
                        .style("opacity", 1)
            });
        const outline_array = outline._groups[0]

        outline_map = new Map(outline_array.map((d) => [d.__data__.id, d]))

        barchart(0, 3142, "#bar-chart", "Number of counties guessed", "Number of counties remaining", 0, "Number of counties last named")
        barchart(0, 331092220, "#pop-chart", "Total population of counties guessed", "Population remaining", 0, "Population of counties last named")
        barchart(0, 538, "#vote-chart", "Electoral Votes Won", "Electoral Votes remaining", 0, "")

        map_tooltip = d3.select('#svg-map-container').append("div")
        .attr("class", "maptooltip")

        svg.call(zoom);

        function reset() {
            outline.transition()
                .attr("stroke-width", 0);
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity,
                d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
            );
            barchart(total_electoral_votes, 538, "#vote-chart", "Electoral Votes Won", "Electoral Votes remaining", 0, "")
            document.getElementById("total_votes").innerHTML = `The total electoral votes won is: ${total_electoral_votes} / 538`;
        }

        function clicked(event, d) {
            if (curr === d.id) {
                curr = null
                curr_state = null
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
                .translate(-(x0 + x1) / 2 - 12, -(y0 + y1) / 2 - 24),
                d3.pointer(event, svg.node())
            );
            d3.select(state_outline).raise();
            curr_state = mapped_data.get(d.id).state_name
            setLowerBarChart();
        }

        function zoomed(event) {
            const {transform} = event;
            g.attr("transform", transform);
            g.attr("stroke-width", 1 / transform.k);
        }

        function hover(event, d, this_county) {
            let tooltip_opacity = 0.8
            if (color === "orange") {
                tooltip_opacity = 0.9
            } else if (color === "blue") {
                tooltip_opacity = 0.7
            }
            if (this_county.style('fill') === "rgb(255, 255, 0)") {
                this_county
                .style("opacity", 0)
                map_tooltip
                .style("background-color", "rgb(155, 155, 0)");
                tooltip_opacity = 0.9

            } else {
                this_county
                .style("opacity", 0.4);
                map_tooltip
                .style("background-color", this_county.style('fill'));
            }
            zoom_dim = d3.zoomTransform(svg.node())
            mapped_data_county = mapped_data.get(d.id)
            if (finished || named_counties.has(mapped_data_county.county.toLowerCase().replace(/[^a-zA-Z]+/g, ''))) {
                squared_amt = Math.sqrt(zoom_dim.k)
                box_width =  128 * squared_amt
                box_height = 70 * squared_amt
                map_tooltip
                    .style("width", box_width + "px")
                    .style("height", box_height + "px")
                    .style("border-radius", 5 * squared_amt + "px")
                    .style("outline-width", 1 + (squared_amt) + "px")
                    .style("opacity", tooltip_opacity)
                    .style("font-size", (8 * Math.sqrt(zoom_dim.k) + "px"))
                map_tooltip.html(
                    `</br>
                    <p>County: ${mapped_data_county.county_full}</p>
                    </br>
                    <p>State: ${mapped_data_county.state_name}</p>
                    </br>
                    <p>Population: ${mapped_data_county.population.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}</p>`
                )
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
    for (const d of prev_named_counties) {
        d3.select(d).transition()
            .style("fill", color);
    }
    prev_named_counties = d_list
    let prev_named = 0
    let prev_named_pop = 0
    let county_states = []
    for (const d of d_list) {
        d_county = mapped_data.get(d.__data__.id)
        let county_pop = parseInt(d_county.population)
        prev_named_pop += county_pop
        prev_named += 1
        county_states.push(d_county.state_name)
        state_population_gotten.set(d_county.state_name, state_population_gotten.get(d_county.state_name) + county_pop)
        if (checked) {
            d3.select(d).transition()
            .style("fill", "yellow");
        } else {
            d3.select(d).transition()
            .style("fill", color);
        }
    }
    total_pop += prev_named_pop
    total_counties += prev_named
    let should_alert = false
    for (const state of county_states) {
        if (!named_states.has(state)) {
            if (state_population_gotten.get(state) * 2 >= state_totals.get(state)) {
                named_states.set(state, 1)
                total_electoral_votes += state_electoral_votes.get(state)
                d3.select(states_map.get(state)).transition().style("fill", color);
                if (!won && total_electoral_votes >= 270) {
                    won = true
                    should_alert = true
                }
            }
        }
    }
    named_counties.set(input, d_list)
    if (checked) {
        barchart(total_counties, 3142, "#bar-chart", "Number of counties guessed", "Number of counties remaining",
            prev_named, "Number of counties last named")
        barchart(total_pop, 331092220, "#pop-chart", "Total population of counties guessed", "Population remaining",
            prev_named_pop, "Population of counties last named")
    } else {
        barchart(total_counties, 3142, "#bar-chart", "Number of counties guessed", "Number of counties remaining",
            0, "")
        barchart(total_pop, 331092220, "#pop-chart", "Total population of counties guessed", "Population remaining",
            0, "")

    }

    document.getElementById("counties_named").innerHTML = total_counties.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    document.getElementById("total_population").innerHTML = total_pop.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    document.getElementById("input_bar").value = "";
    if (curr !== null) {
        setLowerBarChart();
    } else {
        barchart(total_electoral_votes, 538, "#vote-chart", "Electoral Votes Won", "Electoral Votes remaining", 0, "")
        document.getElementById("total_votes").innerHTML = `The total electoral votes won is: ${total_electoral_votes} / 538`;
    }
    setTimeout(function () {
        if (should_alert) {
            alert("Congratulations! You have won the election!");
        }
    }, 300);
}

fetchJSONData()

function setLowerBarChart() {
    let state_gotten = state_population_gotten.get(curr_state)
    let state_total = state_totals.get(curr_state)
    if (checked) {
        let county_pop = 0
        for (const d of prev_named_counties) {
            d_county = mapped_data.get(d.__data__.id)
            if (d_county.state_name === curr_state) {
                county_pop += parseInt(d_county.population)
            }
        }
        barchart(state_gotten, state_total, "#vote-chart", "Total population of counties guessed in " + curr_state, "Population remaining in " + curr_state,
            county_pop, "Population of counties last named in " + curr_state)
    } else {
        barchart(state_gotten, state_total, "#vote-chart", "Total population of counties guessed in " + curr_state, "Population remaining in " + curr_state,
            0, "")
    }
    document.getElementById("total_votes").innerHTML = `The total population of counties named in ${curr_state} is: 
        ${state_gotten.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")} / ${state_total.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}`;
}



function barchart(percentage, total_percentage, bar_chart, label1, label2, recent_percentage, label3) {
    const rest_of_bar = (total_percentage - percentage)
    const chart = d3.select(`${bar_chart}`);
    chart.selectAll('*').remove();
    const bar_percentage = percentage - recent_percentage
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
        .style("outline-color", 'black')
        .style("outline-style", "solid")
        .style("outline-width", "2px")
        .style('left', '30vw');
    
    chart.append('div')
        .attr('class', 'vl')
        .style('position', 'absolute')
        .style('left', '50vw')
        .style("pointer-events", "none");

    let tooltip = chart
        .append("div")
        .attr('class', 'bartooltip')

    const data = [
        { label: `${label1}`, value: bar_percentage, left: 0, color: color,
            percentage: `(${(100 * percentage/total_percentage).toFixed(2)}\%)`},
        { label: `${label3}`, value: recent_percentage, left: bar_percentage, color: 'yellow',
            percentage: `(${(100 * recent_percentage/total_percentage).toFixed(2)}\%)`},
        { label: `${label2}`, value: rest_of_bar, left: percentage, color: '#444',
            percentage: `(${(100 * rest_of_bar/total_percentage).toFixed(2)}\%)`}, 
    ];

    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x(d.left))
        .attr('width', (d) => x(d.value))
        .attr('height', 100)
        .attr('fill', function (d) {
            if (d.color === "yellow") {
                return `url(#${color}diagonalHatch)`
            }
            return d.color
        })
        .on("mouseenter", function (event, d) {
            let d_pop = d.value
            d3.select(this).style("opacity", 0.4)
            if (d.color === color) {
                d_pop = percentage
                d3.select(this.nextSibling).style("opacity", 0.4)
            } else if (d.color === 'yellow') {
                d3.select(this).style("opacity", 0.4)
            }
            if (d.value != 0) {            
                tooltip
                    .style("opacity", 0.9)
                    .style("outline-color", d.color)
                    .style("outline-style", "solid")
                tooltip.html(
                        `<b>${(d.label)}:</b> ${(d_pop.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"))} ${d.percentage}<br/>`
                        )
            }
    }).on("mousemove", function (event) {
        tooltip.style('top', (event.pageY - 20) + 'px')
            .style('left', (event.pageX + 10) + 'px');
    }).on("mouseout", function (event, d) {
        if (d.color === color) {
            d3.select(this.nextSibling).style("opacity", 1)
        }
        d3.select(this).style("opacity", 1)
        tooltip.style("opacity", 0);
    });
}

d3.select("#prev_named_btn").on("click", function(){
    checked = !(document.getElementById("prev_named").checked);
    document.getElementById("prev_named").checked = checked;
    update();
});

function update() {
    if (checked === false) {
        if (curr !== null) {
            let state_gotten = state_population_gotten.get(curr_state)
            let state_total = state_totals.get(curr_state)
            barchart(state_gotten, state_total, "#vote-chart", "Total population of counties guessed in " + curr_state, "Population remaining in " + curr_state,
                0, "")
        }
        for (const d of prev_named_counties) {
            d3.select(d).transition()
                .style("fill", color);
        }
        barchart(total_counties, 3142, "#bar-chart", "Number of counties guessed", "Number of counties remaining",
        0, "")
        barchart(total_pop, 331092220, "#pop-chart", "Total population of counties guessed", "Population remaining",
        0, "")
    } else {
        if (curr !== null) {
            let state_gotten = state_population_gotten.get(curr_state)
            let state_total = state_totals.get(curr_state)
            let county_pop = 0
            for (const d of prev_named_counties) {
                d_county = mapped_data.get(d.__data__.id)
                if (d_county.state_name === curr_state) {
                    county_pop += parseInt(d_county.population)
                }
            }
            barchart(state_gotten, state_total, "#vote-chart", "Total population of counties guessed in " + curr_state, "Population remaining in " + curr_state,
                county_pop, "Population of counties last named in " + curr_state)
        }
        let prev_named_pop = 0
        let prev_named = 0
        for (const d of prev_named_counties) {
            prev_named += 1
            prev_named_pop += parseInt(mapped_data.get(d.__data__.id).population)
            d3.select(d).transition()
                .style("fill", "yellow");
        }
        barchart(total_counties, 3142, "#bar-chart", "Number of counties guessed", "Number of counties remaining",
        prev_named, "Number of counties last named")
        barchart(total_pop, 331092220, "#pop-chart", "Total population of counties guessed", "Population remaining",
        prev_named_pop, "Population of counties last named")
    }

}

d3.select("#clear_btn").on("click", clear);

function clear() {
    if (confirm("Are you sure you want to clear all counties? This action cannot be undone.")) {
        won = false
        if (finished) {
            d3.select("#input-div").style("opacity", 1);
            d3.select("#input-div").style("pointer-events", "auto");
            d3.select("#Error").style("display", "block");
            d3.select("#finish-text").style("display", "none");
            d3.select("#website").style("display", "none");
            d3.select("#website").style("font-size", "32px");
            d3.select("#website").style("opacity", 1);
        }
        finished = false
        state_population_gotten.forEach((value, key) => {
            state_population_gotten.set(key, 0)
        })
        named_states = new Map()
        total_electoral_votes = 0
        total_pop = 0
        total_counties = 0
        named_counties = new Map()
        prev_named_counties = []

        counties.transition().style("fill", "#444");
        states.transition().style("fill", "none");

        map_tooltip.style("opacity", 0);

        barchart(total_counties, 3142, "#bar-chart", "Number of counties guessed", "Number of counties remaining",
        0, "")
        barchart(total_pop, 331092220, "#pop-chart", "Total population of counties guessed", "Population remaining",
        0, "")

        document.getElementById("counties_named").innerHTML = 0;
        document.getElementById("total_population").innerHTML = 0;
        document.getElementById("input_bar").value = "";
        document.getElementById("Error").innerHTML = "<br/>";

        if (curr !== null) {
            let state_total = state_totals.get(curr_state)
            barchart(0, state_total, "#vote-chart", "Total population of counties guessed in " + curr_state, "Population remaining in " + curr_state,
                0, "")

            document.getElementById("total_votes").innerHTML = `The total population of counties named in ${curr_state} is:  
                0 / ${state_total.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}`;
        } else {
            barchart(0, 538, "#vote-chart", "Electoral Votes Won", "Electoral Votes remaining", 0, "");
            document.getElementById("total_votes").innerHTML = `The total electoral votes won is: 0 / 538`;
        }
    }
}

d3.select("#finish-btn").on("click", finish);

function finish() {
    if (confirm(`Are you sure you want to finish the game? This action cannot be undone.
    \nTo restart after finishing, press the "Clear All Counties" button.`)) {
        finished = true;
        d3.select("#input-div").style("opacity", 0);
        d3.select("#input-div").style("pointer-events", "none");
        d3.select("#Error").style("display", "none");
        document.getElementById("Error").innerHTML = "<br/>";
        d3.select("#finish-text").style("display", "block");
        d3.select("#website").style("display", "block");
    }
}

d3.select("#question").on("click", function () {
    d3.select("#question").style("display", "none")
});

d3.select("#question").on("mouseenter", function () {
    d3.select("#question").style("opacity", 0.5);
});

d3.select("#question").on("mouseleave", function () {
    d3.select("#question").style("opacity", 1);
});

d3.select("#website").on("click", function () {
    window.open("https://www.wutony.com");
    d3.select("#website").style("font-size", "32px");
    d3.select("#website").style("opacity", 1);
});

d3.select("#website").on("mouseenter", function () {
    d3.select("#website").style("opacity", 0.5);
    d3.select("#website").transition().style("font-size", "40px");
});

d3.select("#website").on("mouseleave", function () {
    d3.select("#website").style("opacity", 1)
    d3.select("#website").transition().style("font-size", "32px");
});

d3.select("#color-picker").on("mouseenter", function () {
    d3.select("#color-picker").style("background-color", `${colorMap.get(color)}`);
});

d3.select("#color-picker").on("mouseleave", function () {
    d3.select("#color-picker").style("background-color", `${color}`);
});

d3.select("#color-picker").on("click", function () {
    if (colorSelection) {
        d3.select("#color-picker").transition().style("border-color", "#444");
        d3.select("#color-picker-div").transition().style("display", "none");
    } else {
        d3.select("#color-picker").transition().style("border-color", "rgb(155, 155, 0)");
        d3.select("#color-picker-div").transition().style("display", "block");
    }
    colorSelection = !colorSelection
});

d3.selectAll(".circle-select").on("mouseenter", function () {
    d3.select(this).transition().style("width", "21.5px")
    .style("height", "21.5px").style("margin-top", "1px").style("margin-bottom", "1px");   
});

d3.selectAll(".circle-select").on("mouseleave", function () {
    d3.select(this).transition().style("width", "17.5px")
        .style("height", "17.5px").style("margin-top", "3px").style("margin-bottom", "3px");
});

d3.selectAll(".circle-select").on("click", function () {
    colorSelection = false;
    if (color !== d3.select(this).style("background-color")) {
        color = d3.select(this).style("background-color");
        d3.selectAll(".circle-select").style("border-color", "#444");
        d3.select(this).style("border-color", "rgb(155, 155, 0)");
        changeColor();
    }
    d3.select("#color-picker").transition().style("border-color", "#444").style("background-color", color);
    d3.select("#color-picker-div").transition().style("display", "none");
});

function changeColor() {
    named_states.forEach((value, key) => {
        d3.select(states_map.get(key)).transition().style("fill", color);
    })
    named_counties.forEach((value, key) => {
        for (const d of value) {
            d3.select(d).transition()
                .style("fill", color);
        }
    })
    update();
    if (curr === null) {
        barchart(total_electoral_votes, 538, "#vote-chart", "Electoral Votes Won", "Electoral Votes remaining", 0, "");
    } 
}
