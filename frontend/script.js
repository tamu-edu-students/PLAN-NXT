let cnt = 0;
let server_plan_obj;
let server_url;
let x, y, offsetx, offsety;
let canvas = document.getElementById("dest_copy");
let editable = true;
let tableItems = document.getElementById("tableItems");
let time = 0;
let ctx = canvas.getContext("2d");
let scale = 50;
let top_selected = true;
let fur_selected = true;
let elec_selected = true;
let staff_selected = true;

class TimeExpression {
  constructor(expression) {
    if(expression){
      this.expression = expression;
    }
    else {
      this.expression = "Invalid";
    }
    this.timebar_value = -1.0;
  }
  toDisplayTime(){
    if(this.timebar_value < 0){
      return "Invalid";
    }
    let day_index = parseInt(this.timebar_value / 24);
    let hours = parseInt(this.timebar_value - day_index * 24);
    let minutes = Math.round((this.timebar_value - day_index * 24 - hours) * 60);
    return date_list[day_index] + '/' +String("0" + hours).slice(-2) + ':' + String("0" + minutes).slice(-2);
  }

  calculateStartTime(){
    var timeRe = /^\d{2}\/\d{2}\/\d+:\d{2}$/i;
    var relativeRe = /^t\d+\+\d+:\d{2}/i;
    if(timeRe.test(this.expression)){
      var matched_data = this.expression.match(/\d+/g);
      var day_string = this.expression.substring(0,5);
      var hours = parseInt(matched_data[2]);
      var minutes = parseFloat(matched_data[3]);
      var day_index = -1;
      for(let i = 0; i< date_list.length; i++){
        if(day_string == date_list[i]){
          day_index = i;
          break;
        }
      }
      if(day_index < 0 || hours > 24 || hours < 0 || minutes > 60 || minutes < 0){
        this.timebar_value = -1.0;
        return;
      }
      this.timebar_value = 24 * day_index + hours + minutes / 60.0;
      //console.log("time bar value: ", this.timebar_value);
      for(let i = 0; i< breakdown_time.length; i++){
        if(this.timebar_value >= breakdown_time[i][0] && this.timebar_value < breakdown_time[i][1]){
          alert("Current Start time is inside break down time!");
          this.timebar_value = -1.0;
        }
      }
      return;
    }
    else if (relativeRe.test(this.expression)) {
      var matchedData = this.expression.match(/\d+/g);
      var parentId = matchedData[0];
      var offset = parseFloat(matchedData[1]) + parseFloat(matchedData[2]) / 60.0;
      // For start time, partentID can be equal to childID. Examle: TE11 = TS11 + 5.
      // Self addition is not allowed. Example: TS11 = TS11 + 1.
      if(plan.items.get(parseInt(parentId))){
        var parentValue = plan.items.get(parseInt(parentId)).setup_start.timebar_value;
        if(parentValue >= 0){
          this.timebar_value = addBreakdownTime(parentValue, offset, 0);
          return;
        }
      }
    }
    this.timebar_value = -1.0;
    return;
  }
  calculateEndTime(parentTime){
    var timeRe = /^\d+:\d{2}$/i;
    if (timeRe.test(this.expression)){
      var matchedData = this.expression.match(/\d+/g);
      var offset = parseFloat(matchedData[0]) + parseFloat(matchedData[1]) / 60.0;
      if(parentTime){
        var parentValue = parentTime.timebar_value;
        if(parentValue >= 0){
          this.timebar_value = addBreakdownTime(parentValue, offset, 0);
          return;
        }
      }
    }
    this.timebar_value = -1.0;
    return;
  }
}

function addBreakdownTime(parentValue, offset, breakdown_time_index){
  if(offset == 0){
    return parentValue;
  }
  if(breakdown_time_index >= breakdown_time.length){
    return parentValue + offset;
  }
  if(breakdown_time[breakdown_time_index][0] < parentValue){
    return addBreakdownTime(parentValue, offset, breakdown_time_index + 1);
  }
  var avaliable_time = breakdown_time[breakdown_time_index][0] - parentValue;
  if(avaliable_time <= offset){
    var breakdown_time_interval = breakdown_time[breakdown_time_index][1] - breakdown_time[breakdown_time_index][0];
    return addBreakdownTime(parentValue + avaliable_time + breakdown_time_interval, offset -avaliable_time, breakdown_time_index + 1);
  }
  else{
    return parentValue + offset;
  }
}

let breakdown_time = [
    [12, 13],
    [16, 18]
];
let date_list =["04/28","04/29","04/30","05/01"];

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
// var canvas = document.getElementById("canvas");
var graphs = [];
// var graphAttr = [
//     { x: 20, y: 120, w: 100, h: 60, bgColor: "rgba(111, 84, 153 , 0.8)", canvasObj: canvas },
//     { x: 70, y: 60, w: 50, h: 50, bgColor: "rgba(0, 33, 66 , 0.8)", canvasObj: canvas, shape: "circle" },
//     { x: 20, y: 130, w: 70, h: 70, bgColor: "rgba(228, 134, 50 , 0.8)", canvasObj: canvas, shape: "triangle" }

// ];
var tempGraphArr = [];
dragGraph = function (id, x, y, w, h, strokeStyle, canvas, graphShape) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.strokeStyle = strokeStyle || "rgba(26, 188, 156, 1)";
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.canvasPos = canvas.getBoundingClientRect();
    this.graphShape = graphShape;
}

dragGraph.prototype = {
    paint: function () {
        this.context.beginPath();
        this.context.strokeStyle = this.strokeStyle;
        this.shapeDraw();
    },
    isMouseInGraph: function (mouse) {
        this.context.beginPath();
        this.context.strokeStyle = "rgba(0, 0, 0, 0)";
        // this.context.strokeStyle = 'rgba'
        this.shapeDraw();
        this.context.strokeStyle = this.strokeStyle;
        let res = this.context.isPointInPath(mouse.x, mouse.y);
        return res;
    },

    shapeDraw: function () {
        if (this.graphShape == "rect_room"){
            // draw a rect room
            this.context.rect(this.x-this.w/2, this.y-this.h/2, this.w, this.h);
            this.context.setLineDash([3, 6]);
            this.context.stroke();
            this.context.closePath();
        }
        else if (this.graphShape == "round_room"){
            // draw a round room
            this.context.arc(this.x, this.y, this.w/2, 0, Math.PI * 2);
            this.context.setLineDash([3, 6]);
            this.context.stroke();
            this.context.closePath();
        }
        else if (this.graphShape == "triangle_room"){
            // draw a triangle room
            this.context.moveTo(this.x, this.y - 40 * 50 / scale);
            this.context.lineTo(this.x + 50 * 50 / scale, this.y + 40 * 50 / scale);
            this.context.lineTo(this.x - 50 * 50 / scale, this.y + 40 * 50 / scale);
            this.context.closePath();
            this.context.setLineDash([3, 6]);
            this.context.stroke();
        }
        else if (this.graphShape == "couch"){
            let ctx = this.context;
            ctx.setLineDash([1, 0]);
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + 20 * 50/scale, this.y);
            ctx.lineTo(this.x + 20 * 50/scale, this.y + 20 * 50/scale);
            ctx.lineTo(this.x - 20 * 50/scale, this.y + 20 * 50/scale);
            ctx.lineTo(this.x - 20 * 50/scale, this.y - 20 * 50/scale);
            ctx.lineTo(this.x, this.y - 20 * 50/scale);
            ctx.closePath();
            ctx.stroke();
        }
    },
    erase: function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
canvas.addEventListener("mousedown", function (e) {
    // avoid right click moving
    if(e.button == 1 || e.button == 2){
        return;
    }
    var mouse = {
        x: e.clientX - canvas.getBoundingClientRect().left,
        y: e.clientY - canvas.getBoundingClientRect().top
    };
    // "shape" here represents the object of dragGraph
    graphs.forEach(function (shape) {
        var offset = {
            x: mouse.x - shape.x,
            y: mouse.y - shape.y
        };
        if (shape.isMouseInGraph(mouse)) {
            if((shape.graphShape == "rect_room" || shape.graphShape == "round_room" || shape.graphShape == "triangle_room") && !top_selected){
                return;
            }
            // console.log("cc");
            let id = shape.id;
            tempGraphArr.push(shape);
            canvas.addEventListener("mousemove", function (e) {
                mouse = {
                    x: e.clientX - canvas.getBoundingClientRect().left,
                    y: e.clientY - canvas.getBoundingClientRect().top
                };

                if (shape === tempGraphArr[0]) {
                    shape.x = mouse.x - offset.x;
                    shape.y = mouse.y - offset.y;

                    shape.erase();
                    // shape.paint();
                    // console.log("paint in here");
                    // graphs.forEach(function(graph){
                    //     graph.paint();
                    // })
                    plan.items.get(id).pos_x = (mouse.x - offset.x) * scale / 50;
                    plan.items.get(id).pos_y = (mouse.y - offset.y) * scale / 50;
                    // drawGraph();

                    plan.draw();
                }
            }, false);
            canvas.addEventListener("mouseup", function () {
                tempGraphArr = [];
            }, false);
        }
    });
    e.preventDefault();
}, false);
// right click to edit the icons
canvas.addEventListener("contextmenu", function(e){
    var mouse = {
        x: e.clientX - canvas.getBoundingClientRect().left,
        y: e.clientY - canvas.getBoundingClientRect().top
    };
    graphs.forEach(function (shape){
        var offset = {
            x: mouse.x - shape.x,
            y: mouse.y - shape.y
        };
        if (shape.isMouseInGraph(mouse)) {
            if((shape.graphShape == "rect_room" || shape.graphShape == "round_room" || shape.graphShape == "triangle_room") && !top_selected){
                return;
            }
            //
            closeMenu();
            rightClick(e, mouse, shape.id);
        }
    });
    e.preventDefault();
}, false);
function rightClick(e, mouse, id){
    if(editable == false){
        return;
    }
    e.preventDefault();
    closeMenu();
    let menu = createMenu(e, mouse, id);
    // console.log(typeof(menu), "vvvvv");
    document.getElementById("canvas_div").appendChild(menu);
}
function createMenu(e, mouse, id){
    console.log("create menu");
    x = mouse.x;
    y = mouse.y;
    console.log(x, y);
    let newDiv = document.createElement("ul");
    newDiv.id = "deletionMenu";
    newDiv.setAttribute("class", "context-menu");
    newDiv.style.cssText = `position: absolute; left: ${x}px; top: ${y}px;`;
    let sub1 = createOptionsInMenu(e, "delete", id);
    let sub2 = createOptionsInMenu(e, "edit", id);
    newDiv.appendChild(sub1);
    newDiv.appendChild(sub2);
    return newDiv;
}
// str represents the text
function createOptionsInMenu(e, str, id){
    let opt = document.createElement("li");
    opt.textContent = str;
    opt.setAttribute("onclick", `${str}Item(${id});`);
    return opt;
}
// select deletion
function deleteItem(id){
    console.log("complete deletion");
    // document.getElementById(id).remove();
    console.log("yyyy",typeof(id))
    plan.items.delete(id);
    plan.generateTable();
    plan.draw();
}
function editItem(id){
    // create an input form
    let input_form = document.createElement("div");
    
}
function createInputForm(id){

}
class Item{
    // item_id is the auto-generated id for each item as soon as it's constructed
    item_id;
    // layer consists of: top, furniture, electrical, and staff
    layer;
    // count_id;
    name;
    //start_time;
    //end_time;

    setup_start
    setup_duration
    breakdown_start
    breakdown_duration

    owner;
    //setup_time;
    //breakdown_time;
    finished;
    // type should be consistent with the id of the items in the repository shown in HTML
    type;
    pos_x;
    pos_y;
    rotate;
    width;
    length;
    // user can add any description to an item
    description;
    constructor(){
        this.finished = false;
    }
    //calculateExpression(value.start_time, value.item_id)
    draw(){
        if(this.setup_start.timebar_value > time || this.breakdown_duration.timebar_value < time){
            return;
        }
        if((this.layer == "furniture" && !fur_selected) || (this.layer == "electrical" && !elec_selected) || (this.layer == "staff" && !this.staf_selected)){
            return;
        }
        if(this.layer == "top"){
            this.strokeStyle = "blue";
        }
        if(this.layer == "furniture"){
            this.strokeStyle = "rgba(241, 174, 28, 1)";
        }
        if(this.layer == "electrical"){
            this.strokeStyle = "green";
        }
        if(this.layer == "staff"){
            this.strokeStyle = "red";
        }
        // console.log("thishishihsihs");
        let graph = new dragGraph(this.item_id, this.pos_x * 50 / scale, this.pos_y * 50 / scale, this.width * 50 / scale, this.length * 50 / scale, this.strokeStyle, canvas, this.type);
        graphs.push(graph);
        graph.paint();
    }
}
class Plan{
    items;
    creator;
    current_id;
    constructor(){
        // I use hashmap to store all the items to make sure the storage used is low and deleting and searching fast.
        // However, I still need to perform the sorting algorithm, I would prefer to generate a new array and then sort it by the required attribute
        // the time complexity is O(n + nlogn) = O(nlogn)
        this.items = new Map();
    }
    toJSON() {
        var t = {
            "items": Object.fromEntries(this.items),
            "creator": this.creator,
            "current_id": this.current_id,
        }
        return JSON.stringify(t);
    }
    addItem(item){
        let id = item.item_id;
        if(this.items.has(id)){
            // it's wrong, as the id is self-incremented, we shouldn't have
        }else{
            this.items.set(id, item);
        }
    }
    deleteItem(id){
        if(this.items.has(id)){
            this.items.delete(id);
        }else{
            // no such item
        }
    }
    draw(){
        graphs = [];
        // console.log("plan drawing");
        // console.log(this.items.size);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // while(canvas.hasChildNodes()){
        //     canvas.removeChild(canvas.firstChild);
        // }
        this.items.forEach(drawItems);
    }
    generateTable(){
        $("#tableItemsBody").remove();
        $("#tableItems").append("<tbody id='tableItemsBody'></tbody>");
        console.log("this is what i want ", plan.items);
        this.items.forEach((element) => {
          element.setup_start.calculateStartTime();
          element.setup_duration.calculateEndTime(element.setup_start);
          element.breakdown_start.calculateEndTime(element.setup_start);
          element.breakdown_duration.calculateEndTime(element.breakdown_start);
         });
        this.items.forEach(generateTableItems);
    }
}
let plan = new Plan();
// hashmap iteration function
function drawItems(value, key, map){
    // console.log(value);
    value.draw();
}
function generateTableItems(value, key, map){
  var tr;
  if(!value.finished){
    tr = `<tr>
    <td class="data">${value.item_id}</td>
    <td class="data" onclick="clickToEditData(event, ${value.item_id}, 'name')">${value.name}</td>
    <td class="data" onclick="clickToEditData(event, ${value.item_id}, 'setup_start')">${value.setup_start.toDisplayTime()}</td>
    <td class="data" onclick="clickToEditData(event, ${value.item_id}, 'setup_end')">${value.setup_duration.toDisplayTime()}</td>
    <td class="data" onclick="clickToEditData(event, ${value.item_id}, 'breakdown_start')">${value.breakdown_start.toDisplayTime()}</td>
    <td class="data" onclick="clickToEditData(event, ${value.item_id}, 'breakdown_end')">${value.breakdown_duration.toDisplayTime()}</td>
    <td class="data" onclick="clickToEditData(event, ${value.item_id}, 'owner')">${value.owner}</td>
    <td class="data"> <input type="checkbox" id="checkbox_${value.item_id}" onchange='clickToChangeState(event, ${value.item_id})' /></td>
    </tr>`;
  }
  else{
    tr = `<tr>
    <td class="data" style="background-color:grey;">${value.item_id}</td>
    <td class="data" style="background-color:grey;" onclick="clickToEditData(event, ${value.item_id}, 'name')">${value.name}</td>
    <td class="data" style="background-color:grey;" onclick="clickToEditData(event, ${value.item_id}, 'setup_start')">${value.setup_start.toDisplayTime()}</td>
    <td class="data" style="background-color:grey;" onclick="clickToEditData(event, ${value.item_id}, 'setup_end')">${value.setup_duration.toDisplayTime()}</td>
    <td class="data" style="background-color:grey;" onclick="clickToEditData(event, ${value.item_id}, 'breakdown_start')">${value.breakdown_start.toDisplayTime()}</td>
    <td class="data" style="background-color:grey;" onclick="clickToEditData(event, ${value.item_id}, 'breakdown_end')">${value.breakdown_duration.toDisplayTime()}</td>
    <td class="data" style="background-color:grey;" onclick="clickToEditData(event, ${value.item_id}, 'owner')">${value.owner}</td>
    <td class="data" style="background-color:grey;"> <input type="checkbox" id="checkbox_${value.item_id}" onchange='clickToChangeState(event, ${value.item_id})' /></td>
    </tr>`;
  }
  $("#tableItemsBody").append(tr);
  document.getElementById(`checkbox_${value.item_id}`).checked = value.finished;
}
function clickToSelectTop(){
    // if top is currently selected
    let bt = document.getElementById("top_selector");
    if(top_selected){
        // change the color of the button
        top_selected = false;
        console.log("sssss");
        bt.style.cssText = "background-color: rgb(145, 203, 241); border-color: rgb(145, 203, 241);";
        // change the items in the sources
        document.getElementById("top_layer_items").style.display = "none";
        // draw the items in the canvas
        plan.draw();
    }else{
        // change the color of the button
        top_selected = true;
        // bt.style.backgroundColor = "#1c84c6";
        // bt.style.borderColor = "#1c84c6"
        bt.style.cssText = "background-color: #1c84c6; border-color: #1c84c6;"
        // change the items in the sources
        document.getElementById("top_layer_items").style.display = "";
        plan.draw();
    }
}
function clickToSelectFurniture(){
    // if top is currently selected
    let bt = document.getElementById("furniture_selector");
    if(fur_selected){
        // change the color of the button
        fur_selected = false;
        bt.style.cssText = "background-color: rgb(240, 225, 161); border-color: rgb(240, 225, 161);";
        // change the items in the sources
        document.getElementById("furniture_layer_items").style.display = "none";
        // draw the items in the canvas
        plan.draw();
    }else{
        // change the color of the button
        fur_selected = true;
        bt.style.cssText = "background-color: #f8ac59; border-color: #f8ac59;"
        // change the items in the sources
        document.getElementById("furniture_layer_items").style.display = "";
        plan.draw();
    }
}
function clickToSelectElectrical(){
    // if top is currently selected
    let bt = document.getElementById("electrical_selector");
    if(elec_selected){
        // change the color of the button
        elec_selected = false;
        bt.style.cssText = "background-color: rgb(149, 223, 188); border-color: rgb(149, 223, 188);";
        // change the items in the sources
        document.getElementById("electrical_layer_items").style.display = "none";
        // draw the items in the canvas
        plan.draw();
    }else{
        // change the color of the button
        elec_selected = true;
        bt.style.cssText = "background-color: #16987e; border-color: #16987e;"
        // change the items in the sources
        document.getElementById("electrical_layer_items").style.display = "";
        plan.draw();
    }
}
function clickToSelectStaff(){
    // if top is currently selected
    let bt = document.getElementById("staff_selector");
    if(staff_selected){
        // change the color of the button
        staff_selected = false;
        bt.style.cssText = "background-color: rgb(241, 159, 153); border-color: rgb(241, 159, 153);";
        // change the items in the sources
        document.getElementById("staff_layer_items").style.display = "none";
        // draw the items in the canvas
        plan.draw();
    }else{
        // change the color of the button
        staff_selected = true;
        bt.style.cssText = "background-color: #ea394c; border-color: #ea394c;"
        // change the items in the sources
        document.getElementById("staff_layer_items").style.display = "";
        plan.draw();
    }
}
function clickToEditData(e, item_id, attr){
    // console.log("uuuuu", e.currentTarget.getAttribute("class"));
    let current_item = plan.items.get(parseInt(item_id));
    let table = document.getElementById("table");
    ox = table.getBoundingClientRect().left;
    oy = table.getBoundingClientRect().top;
    x = e.currentTarget.getBoundingClientRect().left;
    y = e.currentTarget.getBoundingClientRect().top;
    console.log(item_id, x, y, ox, oy, e.currentTarget);
    // let newDiv = document.createElement("div");
    // newDiv.id = "editData";
    // newDiv.style.cssText = `position: absolute; left: ${x}px; top: ${y}px;`;
    if(document.getElementById("editData")){
        document.getElementById("editData").remove();
    }
    var dispalyText;
    if(attr == 'setup_start'){
      dispalyText = plan.items.get(item_id).setup_start.expression;
    }
    else if (attr == 'setup_end') {
      dispalyText = plan.items.get(item_id).setup_duration.expression;
    }
    else if (attr == 'breakdown_start') {
      dispalyText = plan.items.get(item_id).breakdown_start.expression;
    }
    else if (attr == 'breakdown_end') {
      dispalyText = plan.items.get(item_id).breakdown_duration.expression;
    }
    else {
      dispalyText = e.currentTarget.innerText;
    }
    $("#table").append(`<div id="editData" style="position: absolute; left: ${x - ox + 3 + table.scrollLeft}px; top: ${y - oy + 3 + table.scrollTop}px">
    <input style="width:100px; height: 30px;" id="blankInput" type="text" onchange="changeData(event, ${item_id}, '${attr}');" value="${dispalyText}">
    </div>`);
    document.getElementById("blankInput").select();
    // let blank = `<input type="text" onchange="">`;
    // $("#editData").append(blank);

}
function clickToChangeState(e, item_id){
    // console.log("uuuuu", e.currentTarget.getAttribute("class"));
    let current_item = plan.items.get(parseInt(item_id));
    current_item.finished = !current_item.finished;
    plan.generateTable();
}
function changeData(e, id, attr){
    // console.log((e.value);
    let item = plan.items.get(id);

    if(attr == 'name'){
        item.name = e.currentTarget.value;
    }
    if(attr == 'setup_start'){
        item.setup_start.expression = e.currentTarget.value;
    }
    if(attr == 'setup_end'){
        item.setup_duration.expression = e.currentTarget.value;
    }
    if(attr == 'breakdown_start'){
        item.breakdown_start.expression = e.currentTarget.value;
    }
    if(attr == 'breakdown_end'){
        item.breakdown_duration.expression = e.currentTarget.value;
    }
    if(attr == 'owner'){
        item.owner = e.currentTarget.value;
    }
    plan.generateTable();
    plan.draw();
    document.getElementById("editData").remove();
}
// button action
function clickToEdit(e){
    //
    editable = true;
    // console.log(editable);
    return;
}
function clickToSave(e){
    console.log("tttt");
    // location.reload(false);
    editable = false;
    // communicate with the server
    let str = JSON.stringify(plan);
    let sentObj = {
        "data":str
    }
    let sentJSON = JSON.stringify(sentObj);

    // server_plan_obj.data.data = str;
    // let server_plan_json = JSON.stringify(server_plan_obj);
    // console.log(str);
    // console.log("-"*10);
    // console.log(server_plan_obj);

    let putRequest = new XMLHttpRequest();
    putRequest.open("put", server_url);
    putRequest.setRequestHeader("Content-type", "application/json");
    putRequest.onload = function(){
        if(putRequest.readyState == 4 && putRequest.status == 200){
            console.log("connection completed");
        }else{
            console.log("error occurred");
        }
    }
    console.log(sentJSON);
    putRequest.send(sentJSON);
    return;
}
function selectTheTime(){
    // console.log("test clicking the timebar");
    let current_time = new TimeExpression();
    current_time.timebar_value = document.getElementById("timebar").value;
    time = current_time.timebar_value;
    // console.log("current time is ", time);
    document.getElementById("showTimebar").innerText = `Plan Time: ${current_time.toDisplayTime()}`;
    plan.draw();
}
function selectTheScale(){
    scale = document.getElementById("scale").value;
    canvas.width = canvasWidth * 50 / scale;
    canvas.height = canvasHeight * 50 / scale;
    plan.draw();
}
function dragstart_handler(ev) {
    if(editable == false){
        return;
    }
    let dragdiv = ev.currentTarget;
    let id = dragdiv.id;
    offsetx = ev.clientX - dragdiv.getBoundingClientRect().left;
    offsety = ev.clientY - dragdiv.getBoundingClientRect().top;
    if(dragdiv.classList.contains("sourceItems")){
        dragdiv.style.opacity = 0.5;
    }
    // update the dataTransfer
    ev.dataTransfer.setData("text", ev.currentTarget.id);
    ev.dataTransfer.setDragImage(dragdiv, offsetx * 2, offsety * 2);
    // Tell the browser both copy and move are possible
    ev.effectAllowed = "copyMove";

}
function dragover_handler(ev) {
    ev.preventDefault();
    console.log("dragOver");
}

function drop_handler(ev) {
    if(editable == false){
        return;
    }
    x = ev.clientX - canvas.getBoundingClientRect().left;
    y = ev.clientY - canvas.getBoundingClientRect().top;
    console.log(ev.clientX, ev.clientY, canvas.getBoundingClientRect().left, canvas.getBoundingClientRect().top);
    console.log("Drop");
    ev.preventDefault();
    let id = ev.dataTransfer.getData("text");
    let dragDiv = document.getElementById(id);
    if (dragDiv.classList.contains("sourceItems") && ev.target.id == "dest_copy") {
        // copy an item and show it on the screen
        // "true" in parentheses ensures that the entire div is copied, including deeper elements

        // var nodeCopy = dragDiv.cloneNode(true);
        // nodeCopy.id = cnt;
        // nodeCopy.style.cssText += `position: absolute; left: ${x - offsetx}px; top: ${y - offsety}px;`;
        // nodeCopy.setAttribute("oncontextmenu", "rightClick(event);");
        // nodeCopy.setAttribute("class", "items");
        // nodeCopy.setAttribute("onclick", "leftClick(event);")
        // ev.target.appendChild(nodeCopy);


        // create a new item, then insert it into the plan and finally update the table
        let current_item = new Item();
        current_item.item_id = parseInt(cnt);
        current_item.pos_x = x * scale / 50;
        current_item.pos_y = y * scale / 50;
        current_item.type = dragDiv.id;
        current_item.width = 60;
        current_item.height = 30;
        current_item.setup_start = new TimeExpression();
        current_item.setup_duration = new TimeExpression();
        current_item.breakdown_start = new TimeExpression();
        current_item.breakdown_duration = new TimeExpression();
        // console.log("kkkkk");
        if(dragDiv.classList.contains("top")){
            current_item.layer = "top";
        }
        if(dragDiv.classList.contains("furniture")){
            current_item.layer = "furniture";
        }
        if(dragDiv.classList.contains("electrical")){
            current_item.layer = "electrical";
        }
        if(dragDiv.classList.contains("staff")){
            current_item.layer = "staff";
        }
        plan.addItem(current_item);
        console.log("asss", plan.items);
        plan.generateTable();
        current_item.draw();
        // editing information
        // showEditingPage(current_item);

        cnt++;
    }
    // here is a bug, when the target location is outside of the "dest_copy" but still inside
    // the current div (ev.target.id == id), it still works for the drag
    else if (dragDiv.getAttribute("class") == "items" && (ev.currentTarget.id == "dest_copy" || ev.currentTarget.id == id)) {
        dragDiv.style.cssText = "position:absolute; left: 120px; top: 240px;";
        dragDiv.style.cssText += `position: absolute; left: ${x - offsetx}px; top: ${y - offsety}px;`;
        // update the attributes of dragged div
        console.log("w yao d id", typeof(dragDiv.id));
        // console.log(plan.items);
        let cur = plan.items.get(parseInt(dragDiv.id));
        cur.pos_x = x - offsetx;
        cur.pos_y = y - offsety;
    }

}
function dragend_handler(ev) {
    console.log("dragEnd");
    document.getElementById(ev.currentTarget.id).style.opacity = 1;
    // Remove all of the drag data
    ev.dataTransfer.clearData();
}

// when clicking on any other space except the menu, the menu disappear
document.addEventListener('click', function(e){
    // console.log(e.target.getAttribute("class"));
    closeMenu();
    if(e.target.getAttribute("class") != "data" && document.getElementById("editData")){
        document.getElementById("editData").remove();
    }
})
function leftClick(e){
    console.log("leftClick on the item");
    let cur_id = parseInt(e.currentTarget.id);
    showEditingPage(plan.items.get(cur_id));
}
function leftClickById(id){
    showEditingPage(plan.items.get(parseInt(id)));
}
function closeMenu(){
    // console.log("clickingggggggggggggg");
    let findMenu = document.getElementById("deletionMenu");
    if(findMenu){
        findMenu.remove();
    }
}



// decode from JSON
function decodeJSON(str){
    // update current cnt, it should be acquired from the JSON code
    let plan_obj = JSON.parse(str);
    // plan = new Plan();
    plan.creator = plan_obj.creator;
    plan.current_id = plan_obj.current_id;
    // plan.items = new Map(Object.entries(plan_obj.items));

    let cur_items = plan_obj.items;

    // decode items
    for(let i in cur_items){
        let cur = new Item();
        cur.item_id = cur_items[i].item_id;
        cur.layer = cur_items[i].layer;
        cur.name = cur_items[i].name;
        //cur.start_time = new TimeExpression(cur_items[i].start_time);
        //cur.end_time = new TimeExpression(cur_items[i].end_time);
        cur.setup_start = new TimeExpression(JSON.parse(cur_items[i].setup_start).expression);
        cur.setup_duration = new TimeExpression(JSON.parse(cur_items[i].setup_duration).expression);
        cur.breakdown_start = new TimeExpression(JSON.parse(cur_items[i].breakdown_start).expression);
        cur.breakdown_duration = new TimeExpression(JSON.parse(cur_items[i].breakdown_duration).expression);
        cur.owner = cur_items[i].owner;
        cur.setup_time = cur_items[i].setup_time;
        cur.breakdown_time = cur_items[i].breakdown_time;
        cur.type = cur_items[i].type;
        cur.pos_x = cur_items[i].pos_x;
        cur.pos_y = cur_items[i].pos_y;
        cur.rotate = cur_items[i].rotate;
        cur.width = cur_items[i].width;
        cur.length = cur_items[i].length;

        plan.addItem(cur);
    }
    console.log(plan);
    return plan;
}
// get JSON from server

function getJSON(){
    let str = new String();
    // get information from current url
    let location = window.location.href;
    // let's mock the location
    // let location = "/plan_models_json/2";
    console.log(location);
    let i = location.lastIndexOf("\/");
    location = location.substring(0, i);
    let j = location.lastIndexOf("\/");
    let id = location.substring(j + 1, i);
    console.log(typeof(id), id);
    // till now, we get the id number
    // then we should launch the get request
    let getRequest = new XMLHttpRequest();
    server_url = "/plan_models_json/" + id;
    getRequest.open("get", server_url);
    getRequest.send(null);
    getRequest.onload = function (){
        if(getRequest.status == 200){
            server_plan_obj = JSON.parse(getRequest.responseText);
            console.log(getRequest.responseText);
            console.log("target", server_plan_obj.data.data);
            return plan_obj.data.data;
        }else{
            console.log("JSON: errors occurred");
        }
    }
    return str;
}
// when loading, get the JSON data and then draw the plan
// plan is a global variable
window.onload = function(){

    let tmp = "{\"items\":{\"0\":{\"item_id\":0,\"layer\":\"furniture\",\"name\":\"weiwei\",\"start_time\":\"04/28/13:00\",\"end_time\":\"2:00\",\"owner\":\"chu\",\"type\":\"couch\",\"pos_x\":80,\"pos_y\":40,\"width\":100,\"height\":60},\"11\":{\"item_id\":11,\"layer\":\"top\",\"name\":\"chuxi\",\"start_time\":\"04/28/13:00\",\"end_time\":\"2:00\",\"owner\":\"zhang\",\"type\":\"triangle_room\",\"pos_x\":400,\"pos_y\":300,\"width\":30,\"height\":40},\"14\":{\"item_id\":14,\"layer\":\"top\",\"name\":\"zhang\",\"start_time\":\"04/28/13:00\",\"end_time\":\"2:00\",\"owner\":\"youli\",\"type\":\"round_room\",\"pos_x\":280,\"pos_y\":120,\"width\":150,\"height\":150}},\"creator\":\"zhang\", \"current_id\":\"16\"}";
    // firstly, try to get data (JSON) from local cache, if cannot find the required data, then get it from the server
    console.log("loading");
    // console.log(JSON.parse(tmp));
    // call the interface from server
    // let plan_json = getJSON();
    console.log(plan);
    plan = decodeJSON(tmp);
    // let json_plan = JSON.stringify(plan_obj);
    // let out = new Plan();
    // out = JSON.parse(JSON.parse(json_plan));
    // console.log("cccccccccccc", json_plan);
    console.log("bbbbbbbbbbbb", plan);
    plan.draw();
    plan.generateTable();
    selectTheTime();
}
