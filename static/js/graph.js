queue()
    //d3.csv - de have to speicfy the format of our file, the second argument is the path to our file in our data directory
    .defer(d3.csv, "data/Salaries.csv")
    //The await method takes 1 argument which is the name of a function ( we can use any name) that we want to call when the data has been downloaded.
    .await(makeGraphs)


//  the second argument is a variable that the data from the CSV file will be passed into by queue.js
function makeGraphs(error, salaryData) {
    //create a crossfilter,one of these for the whole dashboard. Load our salaryData into our crossfilter 
    var ndx = crossfilter(salaryData);

    salaryData.forEach(function(d) {
        d.salary = parseInt(d.salary);
        d.yrs_service = parseInt(d["yrs.service"]);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]) 
    })

    show_discipline_selector(ndx);
    //We pass the ndx variable the crossfilter to the function that's going to draw a graph and we can call this function anything we want

    show_percent_that_are_professors(ndx, "Female","#percent-of-women-professors");
    show_percent_that_are_professors(ndx, "Male","#percent-of-men-professors");

    show_gender_balance(ndx);

    show_average_salaries(ndx);

    show_rank_distribution(ndx);
    
    show_service_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx);

    //Call this function in order to make the chart render
    dc.renderAll();
}


function show_discipline_selector(ndx) {
    var dim = ndx.dimension(dc.pluck('discipline'));
    var group = dim.group();

    dc.selectMenu('#discipline-selector')
        .dimension(dim)
        .group(group);
}


function show_percent_that_are_professors(ndx, gender, element) {
    var percentageThatAreProf = ndx.groupAll().reduce(
        function(p, v) {
            if (v.sex === gender) {
                p.count++;
                if (v.rank === "Prof") {
                    p.are_prof++;
                }
            }
            return p;
        },
        function(p, v) {
            if (v.sex === gender) {
                p.count--;
                if (v.rank === "Prof") {
                    p.are_prof--;
                }
            }
            return p;

        },
        function() {
            return { count: 0, are_prof: 0 }
        }
    );

    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function(d) {
            if (d.count == 0) {
                return 0;
            }
            else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreProf);

}


//In this function we will focus specifically on one graph, each graph will hav its own function
function show_gender_balance(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    var group = dim.group();

    // We use the css selector to indicate that this barchart should be rendered in that div    
    dc.barChart("#gender-balance")
        .width(350)
        .height(250)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        // Specify the dimension and the group
        .dimension(dim)
        .group(group)
        //How quickly thechart animates when we filter
        .transitionDuration(500)
        //In this case it will indicate male/female
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
}

function show_average_salaries(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'))

    //P is an accumulator that keeps track of the total the count and the average and V represents each of the data items that we're adding or removing.
    function add_item(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if (p.count == 0) {
            p.total = 0;
            p.average = 0;
        }
        else {
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        return p;
    }

    //This function creates an initial value for p
    function initialise() {
        return { count: 0, total: 0, average: 0 }
    }

    var averageSalaryByGender = dim.group().reduce(add_item, remove_item, initialise);

    dc.barChart("#average-salary")
        .width(350)
        .height(250)
        .dimension(dim)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .group(averageSalaryByGender)
        .valueAccessor(function(d) {
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}

function show_rank_distribution(ndx) {

    var dim = ndx.dimension(dc.pluck("sex"));

    //Custom reducer written specifically for professors

    // var profByGender = dim.group().reduce(
    //     function(p, v) {
    //         p.total++;
    //         if (v.rank == "Prof") {
    //             p.match++;
    //         }
    //         return p;

    //     },
    //     function(p, v) {
    //         p.total--;
    //         if (v.rank == "Prof") {
    //             p.match--;
    //         }
    //         return p;

    //     },
    //     //our initialize function takes no arguments but it creates the data structure that will be threaded through the calls to add and remove item
    //     function() {
    //         return { total: 0, match: 0 } // total counts the rows and match how many of those were professors
    //     }
    // );


    //Generic function that will find the number of male and female for different ranks
    function rankByGender(dimension, rank) {
        return dimension.group().reduce(
            function(p, v) {
                p.total++;
                if (v.rank == rank) {
                    p.match++;
                }
                return p;

            },
            function(p, v) {
                p.total--;
                if (v.rank == rank) {
                    p.match--;
                }
                return p;

            },
            //our initialize function takes no arguments but it creates the data structure that will be threaded through the calls to add and remove item
            function() {
                return { total: 0, match: 0 } // total counts the rows and match how many of those were professors
            }
        );
    }

    var profByGender = rankByGender(dim, "Prof")
    var asstProfByGender = rankByGender(dim, "AsstProf")
    var assocProfByGender = rankByGender(dim, "AssocProf")

    console.log(profByGender.all());

    dc.barChart("#rank-distribution")
        .width(400)
        .height(250)
        .dimension(dim)
        .group(profByGender, "Prof")
        .stack(asstProfByGender, "AsstProf")
        .stack(assocProfByGender, "AssocProf")
        //We'll also need a value accessor because we've used a custom reducer for this chart. 
        .valueAccessor(function(d) {
            if (d.value.total > 0) {
                return (d.value.match / d.value.total) * 100;
            }
            else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xAxisLabel("Gender")
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({ top: 10, right: 100, bottom: 30, left: 30 });
}


function show_service_to_salary_correlation(ndx){
    
    var genderColors = d3.scale.ordinal()
        .domain(["Female","Male"])
        .range(["pink","blue"])
    
    var eDim = ndx.dimension(dc.pluck("yrs_service")) //we only use this to work out the bounds of the x-axis the minimum and maximum years of service that we need to plot.
    
    //The second dimension that
    // we create actually returns an array with two parts; one being the year or years of
    // service and the other being the salary and this is what allows us to plot the
    // dots of the scatter plot at the right x and y coordinates.
    
    var experienceDim = ndx.dimension(function(d){
        return [d.yrs_service,d.salary,d.sex,d.rank];
    })
    var experienceSalaryGroup = experienceDim.group();
    
    var minExperience= eDim.bottom(1)[0].yrs_service;
    var maxExperience= eDim.top(1)[0].yrs_service;
    
    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience,maxExperience]))
        .brushOn(false) //disable toggling dots and highlighting 
        .symbolSize(8)
        .clipPadding(10) // leaved room for the plot
        .yAxisLabel("Salary")
        .xAxisLabel("Years of Service")
        .title(function(d){                 //What will appear if you hover the mouse over a dot
            return d.key[3] + " earned " + d.key[1] ;     // Referes to the year-salary dimension created earlier
        })
        //decide which piece of data we use as an input into our gender colors scale
        .colorAccessor(function (d){
            return d.key[2]; //d.sex is third item in our dimension (experienceDim)
        })
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({ top: 10, right: 50, bottom: 75, left: 75 });
}




function show_phd_to_salary_correlation(ndx){
    
    var genderColors = d3.scale.ordinal()
        .domain(["Female","Male"])
        .range(["pink","blue"])
    
    var pDim = ndx.dimension(dc.pluck("yrs_since_phd"));
    
    
    var phdDim = ndx.dimension(function(d){
        return [d.yrs_since_phd,d.salary,d.sex,d.rank];
    })
    var phdSalaryGroup = phdDim.group();
    
    var minPhd= pDim.bottom(1)[0].yrs_since_phd;
    var maxPhd= pDim.top(1)[0].yrs_since_phd;
    
    dc.scatterPlot("#phd-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minPhd,maxPhd]))
        .brushOn(false) //disable toggling dots and highlighting 
        .symbolSize(8)
        .clipPadding(10) // leaved room for the plot
        .yAxisLabel("Salary")
        .xAxisLabel("Years since PhD")
        .title(function(d){                 //What will appear if you hover the mouse over a dot
            return d.key[3] + " earned " + d.key[1] ;     // Referes to the year-salary dimension created earlier
        })
        //decide which piece of data we use as an input into our gender colors scale
        .colorAccessor(function (d){
            return d.key[2]; //d.sex is third item in our dimension (experienceDim)
        })
        .colors(genderColors)
        .dimension(phdDim)
        .group(phdSalaryGroup)
        .margins({ top: 10, right: 50, bottom: 75, left: 75 });
}
