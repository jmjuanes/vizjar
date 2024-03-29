// Identity function
const identity = value => value;

// Clamp the provided value
const clamp = (value, min, max) => {
    return Math.min(max, Math.max(min, value));
};

// Calculate the average of the elements of an array
const average = (values, getValue = identity) => {
    let sumValues = 0, counter = 0;
    values.forEach(value => {
        const v = getValue(value);
        if (typeof v === "number" && !isNaN(v)) {
            sumValues = sumValues + value;
            counter = counter + 1;
        } 
    });
    // Return the average only if the count of numbers is > 0
    return (counter > 0) ? sumValues / counter : 0;
};

//Returns the q-quantile value of a given SORTED list of numbers
//https://en.wikipedia.org/wiki/Quantile 
//https://en.wikipedia.org/wiki/Quantile#Estimating_the_quantiles_of_a_population 
const quantile = (q, values, valueOf = identity) => {
    // Check for no values
    if (values.length === 0) {
        return null;
    }
    // Check for negative values of q or for more than 2 values in the list
    if (q <= 0 || values.length < 2) {
        return valueOf(values[0]);
    }
    // Check for numbers of q >= 1
    if (q >= 1) {
        return valueOf(values[values.length -1]);
    }
    //Calculate tue quantile
    const h = (values.length - 1) * q;
    const rh = Math.floor(h);
    return valueOf(values[rh]) + (valueOf(values[rh + 1]) - valueOf(values[rh])) * (h - rh);
};

// Nice number for Heckbert algorithm
const niceNumber = (x, round) => {
    const exp = Math.floor(Math.log10(x));
    const f = x / Math.pow(10, exp);
    let nf = 0;
    if (round === true) {
        nf = (f < 1.5) ? 1 : ((f < 3) ? 2 : ((f < 7) ? 5 : 10));
    }
    else  {
        nf = (f <= 1) ? 1 : ((f <= 2) ? 2 : ((f <= 5) ? 5 : 10));
    }
    return nf * Math.pow(10, exp);
};

// Generate values in the provided range using the Heckbert algorithm
const ticks = (start, end, n, tight = false) => {
    if (start === end) {
        return [start];
    }
    // Check if end < start --> call this method with the reversed arguments
    if (end < start) {
        return ticks(end, start, n, tight);
    }
    const range = niceNumber(end - start, false);
    const step = niceNumber(range / (n - 1), true); // Ticks separation
    const ticksStart = Math.floor(start / step) * step; // Ticks start
    const ticksEnd = Math.ceil(end / step) * step; // Ticks end
    const ticksValues = []; // Output ticks values
    for (let value = ticksStart; value <= ticksEnd; value = value + step) {
        ticksValues.push(parseFloat(value.toFixed(8)));
    }
    // Check for tight option --> remove ticks outside of the [start, end] interval
    // and add start and end values
    if (tight) {
        ticksValues = ticksValues.filter(value => {
            return start < value && value < end;
        });
        // Insert start and end values
        return [start, ...ticksValues, end];
    }
    // Return ticks values
    return ticksValues;
};

// Parse the provided color
const parseColor = color => {
    if (color.startsWith("hsl(")) {
        const m = color.match(/\d+/g);
        return Object.fromEntries(["h", "s", "l"].map((k, i) => [k, Number(m[i])]));
    }
    else if (color.startsWith("rgb(")) {
        const m = color.match(/\d+/g);
        return Object.fromEntries(["r", "g", "b"].map((k, i) => [k, Number(m[i])]))
    }
    else if (color.startsWith("#")) {
        // TODO: supoort shortland hex triplets
        const m = color.match(/[a-f\d]{2}/g);
        return Object.fromEntries(["r", "g", "b"].map((k, i) => [k, parseInt(m[i], 16)]));
    }
    // No valid color provided
    return null;
};

// Format the provided color
const formatColor = color => {
    if (typeof color.h !== "undefined") {
        return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    }
    else if (typeof color.r !== "undefined") {
        return `rgb(${[color.r, color.g, color.b].join(",")})`;
    }
    // No valid color object provided
    return null;
};

// Convert the provided color to HSL
const toHsl = color => {
    if (typeof color === "string") {
        color = parseColor(color);
    }
    if (typeof color.h !== "undefined") {
        return color;
    }
    else if (typeof color.r !== "undefined") {
        const r = color.r / 255, g = color.g / 255, b = color.b / 255;
        const l = Math.max(r, g, b);
        const s = l - Math.min(r, g, b);
        const h = s ? l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s : 0;
        return {
            h: 60 * h < 0 ? 60 * h + 360 : 60 * h,
            s: 100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
            l: (100 * (2 * l - s)) / 2,
        };
    }
    // No valid color
    return null;
};

// Linear interpolation
const interpolateLinear = (a, b) => {
    return a === b ? () => a : t => a + clamp(t, 0, 1) * (b - a);
};

// Hue interpolation
const interpolateHue = (a, b) => {
    const d = b - a;
    return interpolateLinear(a, (d > 180 || d < -180) ? d - 360 * Math.round(d / 360) : d);
};

// Hsl color interpolator
const interpolateHsl = (start, end) => {
    const a = toHsl(start), b = toHsl(end);
    const h = interpolateHue(a.h, b.h);
    const s = interpolateLinear(a.s, b.s);
    const l = interpolateLinear(a.l, b.l);
    return t => {
        return formatColor({h: h(t), s: s(t), l: l(t)});
    };
};

const sequentialScheme = (...args) => Array(3).concat(args);

// Color schemes
// Source: https://colorbrewer2.org/
const schemes = {
    // Categorical
    paired: ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#ffff99","#b15928"],
    pastel1: ["#fbb4ae","#b3cde3","#ccebc5","#decbe4","#fed9a6","#ffffcc","#e5d8bd","#fddaec"],
    pastel2: ["#b3e2cd","#fdcdac","#cbd5e8","#f4cae4","#e6f5c9","#fff2ae","#f1e2cc","#cccccc"],
    set1: ["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#ffff33","#a65628","#f781bf"],
    set2: ["#66c2a5","#fc8d62","#8da0cb","#e78ac3","#a6d854","#ffd92f","#e5c494","#b3b3b3"],
    set3: ["#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5"],
    // Sequential single
    blues: sequentialScheme(
        ["#deebf7","#9ecae1","#3182bd"]
        ["#eff3ff","#bdd7e7","#6baed6","#2171b5"],
        ["#eff3ff","#bdd7e7","#6baed6","#3182bd","#08519c"],
        ["#eff3ff","#c6dbef","#9ecae1","#6baed6","#3182bd","#08519c"],
        ["#eff3ff","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#084594"],
        ["#f7fbff","#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#084594"],
        ["#f7fbff","#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#08519c","#08306b"],
    ),
    greens: sequentialScheme(
        ["#e5f5e0","#a1d99b","#31a354"],
        ["#edf8e9","#bae4b3","#74c476","#238b45"],
        ["#edf8e9","#bae4b3","#74c476","#31a354","#006d2c"],
        ["#edf8e9","#c7e9c0","#a1d99b","#74c476","#31a354","#006d2c"],
        ["#edf8e9","#c7e9c0","#a1d99b","#74c476","#41ab5d","#238b45","#005a32"],
        ["#f7fcf5","#e5f5e0","#c7e9c0","#a1d99b","#74c476","#41ab5d","#238b45","#005a32"],
        ["#f7fcf5","#e5f5e0","#c7e9c0","#a1d99b","#74c476","#41ab5d","#238b45","#006d2c","#00441b"],
    ),
    greys: sequentialScheme(
        ["#f0f0f0","#bdbdbd","#636363"],
        ["#f7f7f7","#cccccc","#969696","#525252"],
        ["#f7f7f7","#cccccc","#969696","#636363","#252525"],
        ["#f7f7f7","#d9d9d9","#bdbdbd","#969696","#636363","#252525"],
        ["#f7f7f7","#d9d9d9","#bdbdbd","#969696","#737373","#525252","#252525"],
        ["#ffffff","#f0f0f0","#d9d9d9","#bdbdbd","#969696","#737373","#525252","#252525"],
        ["#ffffff","#f0f0f0","#d9d9d9","#bdbdbd","#969696","#737373","#525252","#252525","#000000"],
    ),
    oranges: sequentialScheme(
        ["#fee6ce","#fdae6b","#e6550d"],
        ["#feedde","#fdbe85","#fd8d3c","#d94701"],
        ["#feedde","#fdbe85","#fd8d3c","#e6550d","#a63603"],
        ["#feedde","#fdd0a2","#fdae6b","#fd8d3c","#e6550d","#a63603"],
        ["#feedde","#fdd0a2","#fdae6b","#fd8d3c","#f16913","#d94801","#8c2d04"],
        ["#fff5eb","#fee6ce","#fdd0a2","#fdae6b","#fd8d3c","#f16913","#d94801","#8c2d04"],
        ["#fff5eb","#fee6ce","#fdd0a2","#fdae6b","#fd8d3c","#f16913","#d94801","#a63603","#7f2704"],
    ),
    purples: sequentialScheme(
        ["#efedf5","#bcbddc","#756bb1"],
        ["#f2f0f7","#cbc9e2","#9e9ac8","#6a51a3"],
        ["#f2f0f7","#cbc9e2","#9e9ac8","#756bb1","#54278f"],
        ["#f2f0f7","#dadaeb","#bcbddc","#9e9ac8","#756bb1","#54278f"],
        ["#f2f0f7","#dadaeb","#bcbddc","#9e9ac8","#807dba","#6a51a3","#4a1486"],
        ["#fcfbfd","#efedf5","#dadaeb","#bcbddc","#9e9ac8","#807dba","#6a51a3","#4a1486"],
        ["#fcfbfd","#efedf5","#dadaeb","#bcbddc","#9e9ac8","#807dba","#6a51a3","#54278f","#3f007d"],
    ),
    reds: sequentialScheme(
        ["#fee0d2","#fc9272","#de2d26"],
        ["#fee5d9","#fcae91","#fb6a4a","#cb181d"],
        ["#fee5d9","#fcae91","#fb6a4a","#de2d26","#a50f15"],
        ["#fee5d9","#fcbba1","#fc9272","#fb6a4a","#de2d26","#a50f15"],
        ["#fee5d9","#fcbba1","#fc9272","#fb6a4a","#ef3b2c","#cb181d","#99000d"],
        ["#fff5f0","#fee0d2","#fcbba1","#fc9272","#fb6a4a","#ef3b2c","#cb181d","#99000d"],
        ["#fff5f0","#fee0d2","#fcbba1","#fc9272","#fb6a4a","#ef3b2c","#cb181d","#a50f15","#67000d"],
    ),
    // Sequential multi
    ylgnbu: sequentialScheme(
        ["#edf8b1","#7fcdbb","#2c7fb8"],
        ["#ffffcc","#a1dab4","#41b6c4","#225ea8"],
        ["#ffffcc","#a1dab4","#41b6c4","#2c7fb8","#253494"],
        ["#ffffcc","#c7e9b4","#7fcdbb","#41b6c4","#2c7fb8","#253494"],
        ["#ffffcc","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#0c2c84"],
        ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#0c2c84"],
        ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"],
    ),
};

const buildInterpolator = colorScheme => {
    return interpolateHsl(colorScheme[0], colorScheme[colorScheme.length - 1]);
};

// Interpolations
const schemeInterpolations = {
    interpolateBlues: buildInterpolator(schemes.blues[9]),
    interpolateGreens: buildInterpolator(schemes.greens[9]),
    interpolateGreys: buildInterpolator(schemes.greys[9]),
    interpolateOranges: buildInterpolator(schemes.oranges[9]),
    interpolatePurples: buildInterpolator(schemes.purples[9]),
    interporateReds: buildInterpolator(schemes.reds[9]),
};

// Check if the provided groupby parameter is valid
const validateGroupby = value => {
    if (typeof value === "string" && !!value.trim()) {
        return true; // Valid groupby value
    }
    // Check for array
    if (value && Array.isArray(value) && value.length > 0) {
        return value.every(v => typeof v === "string" && !!v.trim());
    }
    // Other value --> not valid
    return false;
};

// Generate a partition
const generatePartition = (data, groupByField) => {
    // TODO: check if groupby is an array
    // Check if a group option has been provided
    // if (typeof options.groupby === "undefined" || options.groupby === null || options.groupby === "") {
    if (!validateGroupby(groupByField)) {
        return {groups: [data], groupby: []};
    }
    const groups = []; //Output groups
    const groupby = [groupByField].flat();
    const maps = {}; //Groups mappings
    data.forEach(datum => {
        const key = groupby.map(f => "" + datum[f]).join(".");
        if (typeof maps[key] === "undefined") {
            groups.push([]);
            maps[key] = groups.length - 1;
        }
        groups[maps[key]].push(datum);
    });
    // Return generated groups
    return {groups: groups, groupby: groupby};
};

// Create an aggregation
const generateAggregation = (data, field) => {
    const groups = {};
    data.forEach(datum => {
        const key = (field !== "__main") ? datum[field] : "__main"; // Check for no group field provided
        if (typeof groups[key] === "undefined") {
            groups[key] = {
                key: key,
                items: [],
                summary: {}
            };
        }
        groups[key].items.push(datum);
    });
    return groups;
};

// Available operations
const operations = {
    // Get the field value of the first item
    first: (values, field) => {
        return values[0][field];
    },
    // Get the field value of the last item
    last: (values, field) => {
        return values[values.length - 1][field];
    },
    // Calculate the minimum field value
    min: (values, field) => {
        return Math.min.apply(null, values.map(v => v[field]));
    },
    // Calculate the max field value
    max: (values, field) => {
        return Math.max.apply(null, values.map(v => v[field]));
    },
    // Calculate que 0,25 quantile
    q1: (values, field) => {
        return quantile(0.25, values, value => value[field]);
    },
    // Calculate the 0.50 quantile (alias of median)
    q2: (values, field) => {
        return quantile(0.50, values, value => value[field]);
    },
    // Calculate the 0,75 quantile
    q3: (values, field) => {
        return quantile(0.75, values, value => value[field]);
    },
    // Calculate the median
    median: (values, field) => {
        return quantile(0.50, values, value => value[field]);
    },
    // Calculate the mean value
    mean: (values, field) => {
        return average(values, value => value[field]);
    },
    // Calcualte the sum of all field values
    sum: (values, field) => {
        return values.reduce((sum, value) => sum + value[field], 0);
    },
    // Count the number of elements
    count: values => values.length,
};

// Create SVG elements
const createNode = (tag, parent) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (parent) {
        parent.appendChild(element);
    }
    return element;
};

// Apply transforms to the provided data
const applyTransformsToData = (data, transforms = []) => {
    return [(transforms || [])].flat().reduce((prevData, transform) => transform(prevData), data);
};

// A simple transform the returns a new data only with the first item
const selectFirstTransform = () => {
    return data => [data[0]];
};

// A simple transform the returns a new data only with the last item
const selectLastTransform = () => {
    return data => [data[data.length - 1]];
};

// A simple transform that returns a new data containing the datum with the minimum value
const selectMinTransform = (options = {}) => {
    // TODO: check if options.field is defined
    const f = options.field;
    return data => {
        return [data.reduce((p, n) => p[f] < n[f] ? p : n, data[0])];
    };
};

// A simple transform that returns a new data containing the datum with the maximum value
// in the specified field
const selectMaxTransform = (options = {}) => {
    // TODO: check if options.field is defined
    const f = options.field;
    return data => {
        return [data.reduce((p, n) => p[f] > n[f] ? p : n, data[0])];
    };
};

// Default strack generator
const defaultStackGenerator = (group, sum, maxSum, field, as) => {
    const last = {positive: 0, negative: 0};
    return group.map(datum => {
        const value = (field !== null) ? datum[field] : 1;
        const sign = (value < 0) ? "negative" : "positive";
        const newDatum = Object.assign({}, datum, {
            [as[0]]: last[sign], // Stack start
            [as[1]]: last[sign] + value // Stack end
        });
        last[sign] = last[sign] + value; // Update last value
        return newDatum;
    });
};

// Centered stak generator
const centerStackGenerator = (group, sum, maxSum, field, as) => {
    let last = (maxSum - sum) / 2;
    return group.map(datum => {
        const value = (field !== null) ? datum[field] : 1;
        const newDatum = Object.assign({}, datum, {
            [as[0]]: last, // Stack start
            [as[1]]: last + value // Stack end
        });
        last = last + value // Update last
        return newDatum;
    });
};

// Stack transform
const stackTransform = (options = {}) => {
    const align = options.align ?? "default";
    const stack = (align === "center") ? centerStackGenerator : defaultStackGenerator;
    const field = options.field ?? null;
    const as = Array.isArray(options.as) ? options.as : ["yStart", "yEnd"];
    // let groupby = (typeof props.groupby === "string") ? props.groupby : null; 
    return data => {
        const {groups, groupby} = generatePartition(data, options.groupby); // Stack groups
        // let maxSumValue = 0; //Store max value of all groups
        const groupSum = []; //To store the grpups sums
        // Get the sum value of all groups
        groups.forEach((group, index) => {
            groupSum[index] = 0; //Initialize group sum
            group.forEach(datum =>{
                // let value = (field !== null) ? Math.abs(datum[field]) : defaultProps.value;
                groupSum[index] = groupSum[index] + Math.abs(datum[field]);
            });
        });
        const groupMaxSum = Math.max.apply(null, groupSum); // Get max group sums
        const outputData = []; // Output data object
        // Build the stack for each group
        groups.forEach((group, index) => {
            stack(group, groupSum[index], groupMaxSum, field, as).forEach(datum => {
                outputData.push(datum);
            });
        });
        return outputData;
    };
};

// Summarize transform
const summarizeTransform = (options = {}) => {
    const groupField = (typeof options.groupby === "string") ? options.groupby : "__main"; 
    return data => {
        const groups = generateAggregation(data, groupField);
        // Check if no operation is provided
        if (typeof options.fields === "undefined" || !Array.isArray(options.fields)) {
            Object.keys(groups).forEach(key => {
                groups[key].summary = {
                    count: groups[key].items.length
                };
            });
        }
        else {
            // Apply transform operations
            // groups = applyGroupsOperations(groups, props.fields, props.op, props.as);
            Object.keys(groups).forEach(key => {
                const output = {}
                options.fields.forEach((field, index) => {
                    const value = operations[op[index]](groups[key].items, field); 
                    const as = (Array.isArray(options.as) && typeof options.as[index] === "string") ? options.as[index] : field;
                    output[as] = value;
                });
                groups[key].summary = output;
            });
        }
        //Check the join to items option
        if (options.join) {
            return data.map(datum => {
                const group = (groupField !== "__main") ? groups[datum[groupField]] : groups[groupField];
                return {
                    ...datum,
                    ...group.summary,
                };
            });
        }
        // No join option provided --> return only the summary data
        return Object.keys(groups).map(key => {
            return {
                ...groups[key].summary,
                [groupField]: key,
            };
        });
    };
};

// Pivot transform
const pivotTransform = (options = {}) => {
    const field = options?.field ?? null;
    const value = options?.value ?? null;
    const op = options?.op ?? "sum";
    if (!field || !value) {
        throw new Error("[pivot] 'field' and 'value' are mandatory options for pivot transform");
    }
    return data => {
        const partition = generatePartition(data, options?.groupby);
        const newData = []; // New data object
        partition.groups.forEach(group => {
            // First generate the pivot items by the field value
            const pivotItems = {};
            group.forEach(datum => {
                const pivotValue = datum[field];
                if (typeof pivotItems[pivotValue] === "undefined") {
                    pivotItems[pivotValue] = [];
                }
                pivotItems[pivotValue].push(datum[value]);
            });
            // Append all pivot items to the new data object
            return Object.keys(pivotItems).forEach(name => {
                const items = pivotItems[name]; //Get pivot items list
                const newDatum = {}; // New datum object
                // Append partition grouoby items to the new datum object
                partition.groupby.forEach(key => {
                    newDatum[key] = items[0][key];
                });
                newDatum[name] = operations[op](items, value); // Generate the aggregation
                newData.push(datum);
            });
        });
        return newData;
    };
};

// Build a linear scale
// Returns a function f(x) in [rangeMin, rangeMax], where x in [domainStart, domainEnd]
const linearScale = (options = {}) => {
    const domain = options?.domain;
    const range = options?.range;
    if (options?.zero) {
        domain[0] = Math.min(0, domain[0]); // ensure that domain start has a zero
        domain[1] = Math.max(0, domain[1]); // ensure that domain end has a zero
    }
    // Scale generator
    const scale = value => {
        const v = clamp(value, domain[0], domain[1]); 
        return range[0] + (range[1] - range[0]) * (v - domain[0]) / (domain[1] - domain[0]);
    };
    // Add scale metadata
    scale.type = "linear";
    scale.range = range;
    scale.domain = domain;
    scale.discrete = false;
    // Invert the scale transform
    scale.invert = value => {
        const v = clamp(value, range[0], range[1]);
        return domain[0] + (v - range[0]) * (domain[1] - domain[0]) / (range[1] - range[0]);
    };
    return scale;
};

// Discrete scale generator
const discreteScale = (options = {}) => {
    const range = options?.range;
    const domain = new Map();
    options?.domain.forEach((value, index) => {
        domain.set(value, index);
    });
    const scale = value => {
        return domain.has(value) ? range[domain.get(value) % range.length] : null;
    };
    scale.type = "discrete";
    scale.range = range;
    scale.domain = options?.domain;
    scale.discrete = true;
    return scale;
};

// Interval scale
const intervalScale = (options = {}) => {
    const margin = clamp(options?.margin ?? 0, 0, 1);
    const spacing = clamp(options?.spacing ?? 0, 0, 1);
    const domain = options?.domain;
    const range = options?.range;
    const intervals = domain.length; // Initialize the number of intervals
    const length = range[1] - range[0];
    const step = length / (2 * margin + (intervals - 1) * spacing + intervals);
    const scale = discreteScale({
        range: domain.map((value, index) => {
            return range[0] + step * (margin + index * spacing + index);
        }), 
        domain: domain,
    });
    scale.type = "interval";
    scale.step = step;
    scale.range = range;
    scale.spacing = spacing;
    scale.margin = margin;
    return scale;
};

// Point scale generator
const pointScale = (options = {}) => {
    const margin = clamp(options?.margin ?? 0, 0, 1);
    const domain = options?.domain;
    const range = options?.range;
    const length = range[1] - range[0];
    const step = length / (2 * margin + domain.length - 1);
    const scale = discreteScale({
        range: domain.map((value, index) => {
            return range[0] + step * (margin + index);
        }),
        domain: domain
    });
    scale.type = "point";
    scale.step = step;
    scale.margin = margin,
    scale.range = range;
    return scale;
};

// Map scales by name
const scalesMap = new Map([
    ["linear", linearScale],
    ["discrete", discreteScale],
    ["categorical", discreteScale],
    ["interval", intervalScale],
    ["point", pointScale],
]);

// Create a path
const createPath = () => {
    const path = [];
    return {
        // Move the current point to the coordinate x,y
        move: (x, y) => path.push(`M${x},${y}`),
        // Draw a line from the current point to the end point specified by x,y
        line: (x, y) => path.push(`L${x},${y}`),
        // Draw a horizontal line from the current point to the end point
        hLine: x => path.push(`H${x}`),
        // Draw a vertical line from the current point to the end point
        vLine: y => path.push(`V${y}`),
        // Draw an arc from the current point to the specified point
        // rx and ry are the two radius of the ellipse
        // angle represents a rotation (in degree) of the ellipse relative to the x-axis
        // laf (large-arc-flag) allows to chose one of the large arc (1) or small arc (0)
        // sf (sweep-flag) allows to chose one of the clockwise turning arc (1) or anticlockwise turning arc (0)
        // x and y become the new current point for the next command
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#Elliptical_Arc_Curve 
        arc: (rx, ry, angle, laf, sf, x, y) => {
            path.push(`A${rx},${ry},${angle},${laf},${sf},${x},${y}`);
        },
        // Draw a quadratic Bézier curve from the current point to the end point specified by x,y
        // The control point is specified by x1,y1 
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#Quadratic_B%C3%A9zier_Curve 
        quadraticCurve: (x1, y1, x, y) => {
            path.push(`Q${x1},${y1},${x},${y}`);
        },
        // Draw a cubic Bézier curve from the current point to the end point specified by x,y
        // The start control point is specified by x1,y1
        // The end control point is specified by x2,y2
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#Cubic_B%C3%A9zier_Curve
        bezierCurve: (x1, y1, x2, y2, x, y) => {
            path.push(`C${x1},${y1},${x2},${y2},${x},${y}`);
        },
        // Close the current path
        close: () => path.push("Z"),
        // Get full path
        toString: () => path.join(" "),
    };
};

// Create a polyline
const createPolyline = (points, closed = false) => {
    const path = createPath();
    if (points && points.length > 0) {
        // Move to the first point of the polyline
        path.move(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            path.line(points[i][0], points[i][1]);
        }
        // Check for closing the path
        if (closed) {
            path.close();
        }
    }
    return path.toString();
};

// Create a rectangle
const createRectangle = args => {
    // Check for no rounded rectangle
    if (typeof args.radius !== "number" || args.radius === 0 || args.width < 2 * args.radius || args.height < 2 * args.radius) {
        const points = [
            [args.x, args.y],
            [args.x + args.width, args.y],
            [args.x + args.width, args.y + args.height],
            [args.x, args.y + args.height]
        ];
        return createPolyline(points, true);
    }
    const path = createPath();
    path.move(args.x + args.radius, args.y);
    path.hLine(args.x + args.width - args.radius);
    path.arc(args.radius, args.radius, 0, 0, 1, args.x + args.width, args.y + args.radius);
    path.vLine(args.y + args.height - args.radius);
    path.arc(args.radius, args.radius, 0, 0, 1, args.x + args.width - args.radius, args.y + args.height);
    path.hLine(args.x + args.radius);
    path.arc(args.radius, args.radius, 0, 0, 1, args.x, args.y + args.height - args.radius);
    path.vLine(args.y + args.radius);
    path.arc(args.radius, args.radius, 0, 0, 1, args.x + args.radius, args.y);
    // Check for mask rectangle
    // if (args.mask === true) {
    //     rect.line(args.x, args.y);
    //     rect.line(args.x, args.y + args.height);
    //     rect.line(args.x + args.width, args.y + args.height);
    //     rect.line(args.x + args.width, args.y);
    // }
    path.close();
    return path.toString();
};

// Generate a circle path
const createCircle = args => {
    const path = createPath();
    path.move(args.x - args.radius, args.y);
    path.arc(args.radius, args.radius, 0, 1, 1, args.x + args.radius, args.y);
    path.arc(args.radius, args.radius, 0, 1, 1, args.x - args.radius, args.y);
    path.close();
    return path.toString();
};

// Linear curve generator
const createLinearCurve = path => {
    let state = 0;
    return {
        end: () => null,
        point: (x, y) => {
            // State 0: move to the specified point
            // State 1: draw a line to this point
            state === 0 ? path.move(x, y) : path.line(x, y);
            state = 1;
        },
    };
};

// Catmull Rom curve generator
const createCatmullRomCurve = (path, t) => {
    let state = 0;
    let x0 = null, x1 = null, x2 = null;
    let y0 = null, y1 = null, y2 = null;
    const tension = (typeof t === "number" ? Math.min(Math.max(t, 0), 1) : 0.5) * 12;
    const addPoint = (x, y) => {
        // State 0 or 3: first point added or resume the interpolation
        if (state === 0 || state === 3) {
            // Move to the specified point only if is the first point
            if (state === 0) {
                path.move(x, y);
            }
            // Draw a line to the specified point
            else {
                path.line(x, y);
            }
            // Duplicate this point
            x2 = x, y2 = y;
            state = 1;
        }
        // State 1: second point added --> update the state and continue
        else if (state === 1) {
            state = 2;
        }
        // State 2: new point: draw the curve
        else if (state === 2) {
            const c1x = (-x0 + tension * x1 + x2) / tension;
            const c1y = (-y0 + tension * y1 + y2) / tension;
            const c2x = (x1 + tension * x2 - x) / tension;
            const c2y = (y1 + tension * y2 - y) / tension;
            path.bezierCurve(c1x, c1y, c2x, c2y, x2, y2);
        }
        // Update the points
        x0 = x1, y0 = y1;
        x1 = x2, y1 = y2;
        x2 = x, y2 = y;
    };
    return {
        end: () => {
            if (state === 2) {
                addPoint(x2, y2);
            }
            state = 3;
        },
        point: (x, y) => addPoint(x, y),
    };
};

const createCurve = (curve = "linear", path) => {
    if (curve === "catmull" || curve === "catmull-rom") {
        return createCatmullRomCurve(path);
    }
    return createLinearCurve(path);
};

// Get the value from a data
const getValueOf = (getValue, datum, index, defaultValue = null, scale = null) => {
    let value = getValue ?? defaultValue;
    if (typeof getValue === "function") {
        value = getValue(datum, index) ?? defaultValue;
    }
    else if (typeof getValue === "string" && getValue) {
        if (typeof datum === "object" && datum !== null) {
            value = datum[getValue] ?? getValue ?? defaultValue;
        }
    }
    // Check applying scale
    return typeof scale === "function" ? scale(value) : value;
};

const buildGeom = (data, options, fn) => {
    // Check if a data object has been provided, so we will generate a geom for each datum
    if (data && Array.isArray(data)) {
        return applyTransformsToData(data, options.transform || []).forEach((item, index) => {
            return fn(item, index, options);
        });
    }
    // If not, generate a single geom using provided options
    else if (data && typeof data === "object") {
        return fn(null, 0, data);
    }
};

// Point geom
const pointGeom = (data, options = {}) => {
    return (parent, plot) => {
        buildGeom(data, options, (item, index, opt) => {
            const element = createNode("circle", parent);
            element.setAttribute("cx", getValueOf(opt.x, item, index, 0, plot?.scales?.x));
            element.setAttribute("cy", getValueOf(opt.y, item, index, 0, plot?.scales?.y));
            element.setAttribute("fill", getValueOf(opt.fill, item, index, "#000"));
            element.setAttribute("r", getValueOf(opt.radius, item, index, 2));
        });
    };
};

// Rectangle Geom
const rectangleGeom = (data, options = {}) => {
    return (parent, plot) => {
        return buildGeom(data, options, (datum, index, opt) => {
            const element = createNode("path", parent);
            const x1 = getValueOf(opt.x1, datum, index, 0, plot?.scales?.x);
            const x2 = getValueOf(opt.x2, datum, index, 0, plot?.scales?.x);
            const y1 = getValueOf(opt.y1, datum, index, 0, plot?.scales?.y);
            const y2 = getValueOf(opt.y2, datum, index, 0, plot?.scales?.y);
            const path = createRectangle({
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.abs(x2 - x2),
                height: Math.abs(y2 - y1),
                radius: getValueOf(opt.radius, datum, index, 0),
            });
            element.setAttribute("d", path);
            element.setAttribute("fill", getValueOf(opt.fill, datum, index, "transparent"));
            element.setAttribute("stroke", getValueOf(opt.strokeColor, datum, index, "#000"));
            element.setAttribute("stroke-width", getValueOf(opt.strokeWidth, datum, index, 1));
        });
    };
};

// Circle Geom
const circleGeom = (data, options = {}) => {
    return (parent, plot) => {
        return buildGeom(data, options, (datum, index, opt) => {
            const element = createNode("path", parent);
            const path = createCircle({
                x: getValueOf(opt.x, datum, index, 0, plot?.scales?.x),
                y: getValueOf(opt.y, datum, index, 0, plot?.scales?.y),
                radius: getValueOf(opt.radius, datum, index, 0),
            });
            element.setAttribute("d", path);
            element.setAttribute("fill", getValueOf(opt.fill, datum, index, "transparent"));
            element.setAttribute("stroke", getValueOf(opt.strokeColor, datum, index, "#000"));
            element.setAttribute("stroke-width", getValueOf(opt.strokeWidth, datum, index, 1));
        });
    };
};

// Text geom
const textGeom = (data, options = {}) => {
    return (parent, plot) => {
        buildGeom(data, options, (datum, index, opt) => {
            const element = createNode("text", parent);
            const x = getValueOf(opt.x, datum, index, 0, plot?.scales?.x);
            const y = getValueOf(opt.y, datum, index, 0, plot?.scales?.y);
            element.setAttribute("x", x);
            element.setAttribute("y", y);
            element.textContent = getValueOf(opt.text, datum, index, "");
            if (typeof opt.rotation !== "undefined") {
                element.setAttribute("transform", `rotate(${getValueOf(opt.rotation, datum, index)}, ${x}, ${y})`);
            }
            element.setAttribute("text-anchor", getValueOf(opt.textAnchor, datum, index, "middle"));
            element.setAttribute("dominant-baseline", getValueOf(opt.baseline, datum, index, "middle"));
            element.setAttribute("fill", getValueOf(opt.fill, datum, index, "#000"));
            element.setAttribute("font-size", getValueOf(opt.size, datum, index, 16));
        });
    };
};

// Simple line geom
const lineGeom = (data, options = {}) => {
    return (parent, plot) => {
        return buildGeom(data, options, (datum, index, opt) => {
            const element = createNode("path", parent);
            const startPoint = [
                getValueOf(opt.x1, datum, index, 0, plot?.scales?.x),
                getValueOf(opt.y1, datum, index, 0, plot?.scales?.y),
            ];
            const endPoint = [
                getValueOf(opt.x2, datum, index, 0, plot?.scales?.x),
                getValueOf(opt.y2, datum, index, 0, plot?.scales?.y),
            ];
            const path = createPolyline([startPoint, endPoint]);
            element.setAttribute("d", path);
            element.setAttribute("fill", "none"); // Prevent filled lines
            element.setAttribute("stroke", getValueOf(opt.strokeColor, datum, index, "#000"));
            element.setAttribute("stroke-width", getValueOf(opt.strokeWidth, datum, index, 1));
        });
    };
};

// Horizontal rule geom
const yRuleGeom = (data, options = {}) => {
    return (parent, plot) => {
        return buildGeom(data, options, (datum, index, opt) => {
            const element = createNode("path", parent);
            const y = getValueOf(opt.y, datum, index, datum ?? 0, plot?.scales?.y);
            element.setAttribute("d", createPolyline([[0, y], [plot.width, y]]));
            element.setAttribute("fill", "none"); // Prevent filled lines
            element.setAttribute("stroke", getValueOf(opt.strokeColor, datum, index, "#000"));
            element.setAttribute("stroke-width", getValueOf(opt.strokeWidth, datum, index, 1));
        });
    };
};

// Vertical rule geom
const xRuleGeom = (data, options = {}) => {
    return (parent, plot) => {
        return buildGeom(data, options, (datum, index, opt) => {
            const element = createNode("path", parent);
            const x = getValueOf(opt.x, datum, index, datum ?? 0, plot?.scales?.x);
            element.setAttribute("d", createPolyline([[x, 0], [x, plot.height]]));
            element.setAttribute("fill", "none"); // Prevent filled lines
            element.setAttribute("stroke", getValueOf(opt.strokeColor, datum, index, "#000"));
            element.setAttribute("stroke-width", getValueOf(opt.strokeWidth, datum, index, 1));
        });
    };
};

// Curve geom
const curveGeom = (data, options = {}) => {
    return (parent, plot) => {
        const path = createPath();
        const element = createNode("path", parent);
        element.setAttribute("fill", "none"); // Prevent filled lines
        element.setAttribute("stroke", getValueOf(options.strokeColor, data[0], 0, "#000"));
        element.setAttribute("stroke-width", getValueOf(options.strokeWidth, data[0], 0, 1));
        // Data must be a valid array and with at least 2 items
        if (data && data.length >= 2) {
            const curveType = getValueOf(options.curve, data[0], 0, "linear");
            const curve = createCurve(curveType, path);
            for (let i = 0; i < data.length; i++) {
                const x = getValueOf(options.x, data[i], i, 0, plot?.scales?.x);
                const y = getValueOf(options.y, data[i], i, 0, plot?.scales?.y);
                curve.point(x, y);
            }
            curve.end();
        }
        element.setAttribute("d", path.toString());
    };
};

// Area geom
const areaGeom = (data, options = {}) => {
    return (parent, plot) => {
        const path = createPath();
        const element = createNode("path", parent);
        element.setAttribute("fill", getValueOf(options.fill, data[0], 0, "#000"));
        element.setAttribute("stroke", getValueOf(options.strokeColor, data[0], 0, "#000"));
        element.setAttribute("stroke-width", getValueOf(options.strokeWidth, data[0], 0, 1));
        // Data must be a valid array and with at least 2 items
        if (data && data.length >= 2) {
            const curveType = getValueOf(options.curve, data[0], 0, "linear");
            const curve = createCurve(curveType, path);
            // Move forward
            for (let i = 0; i < data.length; i++) {
                const x = getValueOf(options.x1, data[i], i, 0, plot?.scales?.x);
                const y = getValueOf(options.y1, data[i], i, 0, plot?.scales?.y);
                curve.point(x, y);
            }
            curve.end();
            // Move reverse
            for (let i = data.length - 1; i >= 0; i--) {
                const x = getValueOf(options.x2, data[i], i, 0, plot?.scales?.x);
                const y = getValueOf(options.y2, data[i], i, 0, plot?.scales?.y);
                curve.point(x, y);
            }
            curve.end();
            path.close();
        }
        element.setAttribute("d", path.toString());
    };
};

// Interpolate scale values
const getAxisValues = (scale, count) => {
    if (scale.discrete) {
        return scale.domain;
    }
    // Get the range values
    const start = Math.min.apply(null, scale.domain); // Get start value
    const end = Math.max.apply(null, scale.domain); // Get end value
    return ticks(start, end, count).filter(value => {
        return start <= value && value <= end;
    });
};

// Render axis
const renderAxis = (parent, options, scale, plot) => {
    const position = options?.position;
    const values = getAxisValues(scale, 5);
    const axisPosition = {};
    if (position === "top" || position === "bottom") {
        axisPosition.x1 = 0 + Math.min(scale.range[0], scale.range[1]);
        axisPosition.y1 = (position === "top") ? 0 : plot.height;
        // axisPosition.x2 = 0 + Math.max(scale.range[0], scale.range[1]);
        // axisPosition.y2 = (position === "top") ? 0 : plot.height;
    }
    else {
        axisPosition.x1 = (position === "left") ? 0 : plot.width;
        axisPosition.y1 = 0 + Math.min(scale.range[0], scale.range[1]);
        // axisPosition.x2 = (position === "left") ? 0 : plot.width;
        // axisPosition.y2 = 0 + Math.max(scale.range[0], scale.range[1]);
    }
    // Display ticks
    const offset = 5;
    // let labelAngle = context.value(props.labelRotation, null, defaultProps.labelRotation); //Get rotation angle
    // let labelOffset = context.value(props.labelOffset, 0, defaultProps.labelOffset); //Get ticks offset
    // let labelTick = context.value(props.tick, null, defaultProps.tick); //Display tick slot
    // let labelInterval = 0; //Interval position
    // if (scale.type === "interval") {
    //     labelInterval = context.value(props.labelInterval, null, defaultProps.labelInterval);
    // }
    // Display each tick value
    values.forEach((value, index) => {
        let valuePosition = scale(value, index);
        let x = 0, y = 0, textAnchor = "middle", textBaseline = "middle";
        let linePoints = [], gridPoints = [];
        if (valuePosition === null || typeof valuePosition === "undefined") {
            return;
        }
        // Check for interval scale
        if (scale.type === "interval") {
            valuePosition = valuePosition + scale.step * 0.5; // labelInterval;
        }
        // Calculate tick position
        if (position === "left" || position === "right") {
            x = axisPosition.x1 + (((position === "left") ? -1 : +1) * offset);
            y = valuePosition + 0; //props.y + props.height - position;
            textAnchor = position === "left" ? "end" : "start";
            // Generate tick line points
            linePoints = [
                [axisPosition.x1, y],
                [axisPosition.x1 + (((position === "left") ? -1 : +1) * offset / 2), y],
            ];
            // Generate grid line points
            gridPoints = [[0, y], [plot.width, y]];
        }
        else {
            x = valuePosition + 0;
            y = axisPosition.y1 + (((position === "top") ? -1 : +1) * offset);
            textBaseline = position === "bottom" ? "hanging" : "baseline";
            // Generate tick line points
            linePoints = [
                [x, axisPosition.y1],
                [x, axisPosition.y1 + (((position === "top") ? -1 : +1) * offset / 2)],
            ];
            // Generate grid line points
            gridPoints = [[x, 0], [x, plot.height]];
        }
        // Render tick text
        const text = createNode("text", parent);
        text.textContent = typeof options.format === "function" ? options.format(value) : value;
        text.setAttribute("x", x);
        text.setAttribute("y", y);
        text.setAttribute("text-anchor", options?.tickAlign ?? textAnchor);
        text.setAttribute("alignment-baseline", options?.tickBaseline ?? textBaseline);
        // text.setAttribute("transform", `rotate(${labelAngle}, ${labelX}, ${labelY})`); 
        text.setAttribute("fill", options?.tickColor ?? "#000");
        text.style.setProperty("font-weight", options?.tickWeight ?? "normal");
        text.style.setProperty("font-size", options?.tickSize ?? "10px");
        // Render tick line
        const line = createNode("path", parent);
        line.setAttribute("d", createPolyline(linePoints, false));
        line.setAttribute("fill", "none");
        line.setAttribute("stroke-width", "1px");
        line.setAttribute("stroke", options?.tickColor ?? "#000");
        // Render grid line
        const grid = createNode("path", parent);
        grid.setAttribute("d", createPolyline(gridPoints, false));
        grid.setAttribute("fill", "none");
        grid.setAttribute("stroke-width", "1px");
        grid.setAttribute("stroke", options?.gridColor ?? "#000");
        grid.setAttribute("opacity", options?.grid ? (options?.gridOpacity ?? 0.2) : 0);
    });
};

// Build plot scales
const getPlotScale = (props, defaultScale = "linear", range = []) => {
    const scale = scalesMap.get(props?.scale || defaultScale);
    return scale({
        ...props,
        range: range,
    });
};

// Generate a simple plot
const createPlot = (options = {}, parent = null) => {
    const scene = createNode("svg", parent);
    const target = createNode("g", scene);
    // Set scene attributes
    scene.setAttribute("width", options.width ?? 500);
    scene.setAttribute("height", options.height ?? 500);
    scene.style.setProperty("user-select", "none"); // Disable user selection
    // Calculate margins and drawing size
    const margin = options.margin ?? 0;
    const width = (options.width ?? 500) - 2 * margin;
    const height = (options.height ?? 500) - 2 * margin;
    target.setAttribute("transform", `translate(${margin},${margin})`);
    // Initialize plot scales
    const scales = {
        x: getPlotScale(options?.x, "linear", [0, width]),
        y: getPlotScale(options?.y, "linear", [height, 0]),
    };
    // Build axis
    ["x", "y"].forEach(axis => {
        const axisParent = createNode("g", target);
        const axisOptions = {
            ...options?.[axis],
            grid: options?.[axis]?.grid ?? options?.grid ?? false,
            position: axis === "x" ? "bottom" : "left",
        };
        renderAxis(axisParent, axisOptions, scales[axis], {width, height, scales});
    });
    // Iterate over all available geoms
    (options.geoms ?? []).forEach(geom => {
        if (geom && typeof geom === "function") {
            geom(createNode("g", target), {width, height, scales});
        }
    });
    return scene;
};

export default {
    plot: createPlot,
    path: createPath,
    operations: operations,
    geom: {
        text: textGeom,
        point: pointGeom,
        rectangle: rectangleGeom,
        circle: circleGeom,
        line: lineGeom,
        xRule: xRuleGeom,
        yRule: yRuleGeom,
        curve: curveGeom,
        area: areaGeom,
    },
    scale: {
        linear: linearScale,
        discrete: discreteScale,
        interval: intervalScale,
        point: pointScale,
    },
    math: {
        clamp: clamp,
        niceNumber: niceNumber,
        ticks: ticks,
        average: average,
        quantile: quantile,
    },
    transform: {
        pivot: pivotTransform,
        selectFirst: selectFirstTransform,
        selectLast: selectLastTransform,
        selectMax: selectMaxTransform,
        selectMin: selectMinTransform,
        stack: stackTransform,
        summarize: summarizeTransform,
    },
    data: {
        transform: applyTransformsToData,
    },
    color: {
        parse: parseColor,
        format: formatColor,
        toHsl,
        interpolateHsl,
    },
    scheme: {
        ...schemes,
        ...schemeInterpolations,
    },
};
