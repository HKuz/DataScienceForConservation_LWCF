// LWCF Grant Amounts by County Map

// Path to topoJSON county data and grant data
const mapPath = 'https://cdn.jsdelivr.net/npm/us-atlas@2/us/10m.json';
const grantPath = './GrantMap/us_grants_by_county.json';

// Other set up
const format = d3.format("$,");
const path = d3.geoPath();

const svgWidth = 960;
const svgHeight = 600;

// Create SVG element to hold map
const svg = d3.select("#map")
  .append("svg")
  .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight)
  .style("width", "100%")
  .style("height", "auto");

// Create a group to hold counties and states (will pan and zoom this group)
const g = svg.append("g");

// Create a scale to map total grant value of a county to a color
const color = d3.scaleThreshold()
    .domain([
      100000,
      200000,
      300000,
      400000,
      700000,
      1000000,
      5000000,
      10000000])
    .range(d3.schemeGreens[9]);

// Format grant thresholds for the legend
const formatDict = {
  100000: "$100K",
  200000: "$200K",
  300000: "$300K",
  400000: "$400K",
  700000: "$700K",
  1000000: "$1M",
  5000000: "$5M",
  10000000: "$10M"
};

legend = g => {
  const w = 260;
  const length = color.range().length;

  const x = d3.scaleLinear()
      .domain([1, length - 1])
      .rangeRound([w / length, w * (length - 1) / length]);

  // Draw boxes for each color threshold
  g.selectAll("rect")
    .data(color.range())
    .join("rect")
      .attr("x", (d, i) => x(i))
      .attr("width", w / length)
      .attr("height", 8)
      .attr("fill", d => d);

  // Add legend title
  g.append("text")
      .attr("y", -6)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .text("Total Value of LWCF Grants (US$)");

  // Draw ticks and labels
  g.call(d3.axisBottom(x)
      .tickSize(10)
      .ticks(length - 1)
      .tickFormat(i => formatDict[color.domain()[i - 1]])
      )
    .select(".domain")
      .remove();
}

// Add group to hold the legend and call legend function
svg.append("g")
  .attr("transform", "translate(600,40)")
  .call(legend);

// Create requests to retrieve JSON topography and grant data
const getMapData = d3.json(mapPath);
const getGrantData = d3.json(grantPath);

Promise.all([getMapData, getGrantData]).then(function(values) {
  const us = values[0];
  const grants = values[1];


  const counties = topojson.feature(us, us.objects.counties).features;
  const states = topojson.mesh(us, us.objects.states, (a, b) => a !== b);

  // Map state id (2-digit number) to properties obj (which includes state name)
  const st = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]));

  // Tooltip setup
  const tooltip = d3.select("#tooltip")
    .style("display", "none")
    .classed("tooltip", true);

  // Create county map and add tooltip functionality
  g.selectAll("path")
    .data(counties)
    .join("path")
      .attr("fill", d => {
        if (grants[d.id]) {
          return color(+grants[d.id]['grant_value']);
        } else {
          return "gray"
        }
      })
      .attr("d", path)
      .style("opacity", 0.85)
      .on("mouseover", function(d) {
        tooltip.transition()
          .style("display", "inline")
          .style("opacity", .9);

        // Change the style of the selected county
        d3.select(this)
          .style("opacity", 1)
          .style("stroke-width", 2);
      })
      .on("mousemove", function(d) {
        if (grants[d.id]) {
          let dataPoint = "<div>" +
            "<strong><span class='label'>County: </span></strong>" +
            d.properties.name + ", "+ st.get(d.id.slice(0, 2)).name + "<br />" +

            "<strong><span class='label'>No. Grants: </span></strong>" +
            grants[d.id]['num_grants'] +

            "<strong><span class='label'>Total Value: </span></strong>" +
            format(grants[d.id]['grant_value']) +
            "</div>";
        } else {
          let dataPoint = "<div>" +
            "<strong><span class='label'>County: </span></strong>" +
            d.properties.name + ", "+ st.get(d.id.slice(0, 2)).name + "<br />" +
            "</div>";
        }

        tooltip.html(dataPoint)
          .style("left", (d3.event.pageX + 32) + "px")
          .style("top", (d3.event.pageY + 32) + "px");
      })
      .on("mouseout", function(d) {
        // Fade tooltip when mouse leaves
        tooltip.transition()
          .style("opacity", 0)
          .style("display", "none");

        // Revert country to original style
        d3.select(this)
          .style("opacity", 0.85)
          .style("stroke-width", 0.5);
      });
    // .append("title")
    //   .text(d => {
    //     if (grants[d.id]) {
    //       return `${d.properties.name}, ${st.get(d.id.slice(0, 2)).name}\nNo. Grants: ${grants[d.id]['num_grants']}\nTotal Value: ${format(grants[d.id]['grant_value'])}`;
    //     } else {
    //      return `${d.properties.name}, ${st.get(d.id.slice(0, 2)).name}`;
    //     }
    //   });

  // Add state outlines
  g.append("path")
    .datum(states)
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path);

  // Add pan and zoom behavior
  const pad = 140;

  svg.call(d3.zoom()
    .scaleExtent([1, 6])
    .translateExtent([[0, -pad], [svgWidth, svgHeight + pad]])
    .on("zoom", zoomed)
  );

  function zoomed() {
    g.attr("transform", d3.event.transform);
  }

});
