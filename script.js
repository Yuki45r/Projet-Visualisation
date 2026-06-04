const width = 1000;
const height = 550;
const marginTop = 40;
const marginBottom = 70;
const marginLeft = 70;
const marginRight = 200;

// Création du svg
const svg = d3
  .select("#dataviz")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("border", "1px solid black")
  .style("margin-top", "20px")
 
  .append("g")
  .attr("transform", `translate(${marginLeft}, ${marginTop})`);

// Score vs Popularité
function Scatter() {
  d3.csv("top_15000_anime.csv")
    .then((data) => {
      console.log(data); // affiche les données dans la console

      // Axe Y : score
      const y = d3
        .scaleLinear()
        .domain([d3.min(data, (d) => Number(d.score)) - 0.1, 10])
        .range([height - marginTop - marginBottom, 0]);

      svg.append("g").call(d3.axisLeft(y));

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height - marginTop - marginBottom) / 2)
        .attr("y", -50)
        .text("Score");

      // Axe X : popularité (1 = le plus populaire à gauche)
      const x = d3
        .scaleLinear()
        .domain([d3.max(data, (d) => Number(d.popularity)), 1])
        .range([0, width - marginLeft - marginRight]);

      // Mettre xAxis dans un variable pour l'utiliser dans brush
      const xAxis = svg
        .append("g")
        .attr("transform", `translate(0,${height - marginTop - marginBottom})`)
        .call(d3.axisBottom(x));

      svg
        .append("text")
        .attr("x", (width - marginLeft - marginRight) / 2)
        .attr("y", height - marginTop - marginBottom + 50)
        .text("Popularity (Classement)");


      // Certains animes appartiennent à plusieurs genres 
      // Extraction du premier genre de chaque anime
      // Avec l'aide d'une IA 
      const genres = [
        ...new Set(
          data.map((d) => {
            if (d.genres) {
              return d.genres.split(",")[0];
            } // Garder que le premier genre avant la virgule
            return "Unknown";// Pour les animés qui n'ont pas de genre 
          }),
        ),
      ];

      // Couleur par genre
      const couleurs = d3
        .scaleOrdinal()
        .domain(genres)
        .range(d3. quantize(d3.interpolateTurbo, genres.length)); // Les palettes ne suffissent pas pour plusieurs genres
        // J'ai trouvé d3.interpolateTurbo mais sans quantize, les couleurs étaient tous noirs
        // Avec l'aide d'une IA, utilisation de d3.quantize() pour générer une couleur distincte par genre. 

      // Légendes des genres
      const legende = svg
        .append("g")
        .attr(
          "transform",
          `translate(${width - marginLeft - marginRight + 20}, 0)`,
        );

      genres.forEach((genre, i) => {
        const leg = legende
          .append("g")
          .attr("transform", `translate(0,${i * 20})`);

        leg
          .append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", couleurs(genre));

        leg
          .append("text")
          .text(genre)
          .style("font-size", "11px")
          .attr("dx", 15)
          .attr("dy", 10);
      });

      //Tooltip 
      const tooltip = d3
        .select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#171616")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("font-size", "13px")
        .style("opacity", 0);

      const mouseover = function () {
        tooltip.style("opacity", 1);
      };

      const mousemove = function (event, d) {
        tooltip
          .html(
            "<strong>" +
              d.name +
              "</strong><br>" +
              "Score : " +
              d.score +
              "<br>" +
              "Popularity : " +
              d.popularity,
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 30 + "px");
      };

      const mouseout = function () {
        tooltip.transition().duration(200).style("opacity", 0);
      };

      // ClipPath: tout ce qui se trouve en dehors de cette zone ne sera pas dessiné
      svg
        .append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom);

      // Variable scatter: contient les cerles et le brush
      const scatter = svg.append("g").attr("clip-path", "url(#clip)");

      // Fonction qui définit idleTimeOut à null
      let idleTimeout;
      function idled() {
        idleTimeout = null;
      }

      //Brush
      const brush = d3
        .brushX()
        .extent([
          [0, 0],
          [width - marginLeft - marginRight, height - marginTop - marginBottom],
        ])
        .on("end", updateChart);

      scatter.append("g").attr("class", "brush").call(brush);

      // Circle
      scatter
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(Number(d.popularity)))
        .attr("cy", (d) => y(Number(d.score)))
        .attr("r", 2)
        .attr("fill", (d) => {
          // J'ai demander à une IA
          let genre = "Unknown";
          if (d.genres) {
            genre = d.genres.split(",")[0]; // on prend le premier genre avant la virgule
          }
          return couleurs(genre);
        })
        .attr("opacity", 0.7)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseout", mouseout);


      // Sélectionnez une zone pour effectuer un zoom
      // Doucle-clique pour dézoomer
      //Fonction qui met à jour le graphe selon la sélection brush
      function updateChart(event) {
        const extent = event.selection; // Récupère la sélection brush
        // Si pas de sélection, on réinitialise le domaine x
        // Sinon zoom sur la sélection
        if (!extent) {
          if (!idleTimeout) return (idleTimeout = setTimeout(idled, 350));
          x.domain([d3.max(data, (d) => Number(d.popularity)), 1]);
        } else {
          x.domain([x.invert(extent[0]), x.invert(extent[1])]);
          // Efface la sélection brush après le zoom
          scatter.select(".brush").call(brush.move, null);
        }
        // Met à jour l'axe x et la position des cercles

        xAxis.transition().duration(1000).call(d3.axisBottom(x));

        scatter
          .selectAll("circle")
          .transition()
          .duration(1000)
          .attr("cx", (d) => x(Number(d.popularity)))
          .attr("cy", (d) => y(Number(d.score)));
      }
    })
    .catch((error) => {
      throw error; // affiche l'erreur si le CSV ne charge pas
    });
}
Scatter();
