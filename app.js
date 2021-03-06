var db;
var orders;
var datePickerOrderDate;
var datePickerShipDate;
var datePickerReceivedDate;
var boardsDropDown;
var infoModal;
var uid;
const boards = ["Mini S", "Mini X", "Plus", "Stealth"];
var shipConfirmationCheckBox;
var receiveCheckBox;
var orderNumberInput;
var lbl_order;

function auth(){
    firebase.auth().signInAnonymously().catch(function(error) {
        //console.log(error.code);
        //console.log(error.message); 
    });
}

function init(){
    const config = {
        apiKey: "AIzaSyCCjUSMtGLxP9QG__JVccATwhQxwzPIgCo",
        authDomain: "boosted-order-tracker.firebaseapp.com",
        databaseURL: "https://boosted-order-tracker.firebaseio.com",
        projectId: "boosted-order-tracker",
        storageBucket: "",
        messagingSenderId: "369103350518",
        timestampsInSnapshots: true
    };
    firebase.initializeApp(config);
    db = firebase.firestore();
    db.settings({timestampsInSnapshots: true});
    orders = db.collection('orders')
    auth();
}

function initMaterializePlugins(){
    document.addEventListener('DOMContentLoaded', function() {
        var elems = document.querySelectorAll('select');
        var instances = M.FormSelect.init(elems, {});
        boardsDropDown = instances[0];
    });

    document.addEventListener('DOMContentLoaded', function() {
        var elems = document.querySelectorAll('.modal');
        var instances = M.Modal.init(elems, {});
        infoModal = instances[0];
    });   
    
    document.addEventListener('DOMContentLoaded', function() {
        var elems = document.querySelectorAll('.datepicker');
        var instances = M.Datepicker.init(elems, {
            minDate: new Date(2018, 3, 17, 0, 0, 0, 0),
            maxDate: new Date(),
            autoClose:true,
        });
        datePickerOrderDate = instances[0];
        datePickerShipDate = instances[1];
        datePickerReceivedDate = instances[2];
    });
}

function saveOrder(order){
    if(uid === undefined){
        M.toast({html: 'Error!'});
        return;
    }
    if(order.order_number.length > 6){
        M.toast({html: 'Order # too long!'});
        return;
    }
    if(order.order_number.length < 3){
        M.toast({html: 'Order # too short!'});
        return;
    }
    if(datePickerOrderDate.date === undefined){
        M.toast({html: 'Please enter the order date'});
        return;
    }
    orders.doc(uid).set(order, { merge: true })
    .then(()=>{
        M.toast({html: 'Saved!'});
        $("html, body").animate({
            scrollTop: $("#orders").offset().top
        });
    });
}

function listenDB(){
    orders.onSnapshot(function(querySnapshot){

        //todo: implement docChanges() for better performance when we'll have lots of orders in the list
        $("#orders-table tr").remove();
        let count = 0;
        querySnapshot.forEach(doc => {
            count += 1;
            const data = doc.data();
            const formattedOrderNumber = utils.formatOrderNumber(data.order_number);
            const dataOrderId = formattedOrderNumber == "N/A" ? "-1" : formattedOrderNumber;
            const $tr = $('<tr>').append(
                $('<td data=' + data.board_id +'>').text(boards[data.board_id]),
                $('<td data=' + dataOrderId + '>').text(formattedOrderNumber),
                $('<td data=' + (data.order_date? data.order_date.seconds : '-1') + '>').text(utils.generateDate(data.order_date)),
                $('<td data=' + (data.ship_date? data.ship_date.seconds : '-1')+ '>').text(utils.generateDate(data.ship_date)),
                $('<td data=' + (data.receive_date? data.receive_date.seconds : '-1') + '>').text(utils.generateDate(data.receive_date))
            );
            if(doc.id == uid){
                $tr.css('background-color', '#f2f2f2');
            }
            $tr.appendTo('#orders-table');
        });
        $("#tracked-or-loading").text(" orders have been shared!");
        $("#order-count").text(count);
    });
}

function waitForAuth(){
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          listenDB();
          uid = user.uid; 
          const orderRef = orders.doc(uid);
          orderRef.get().then(doc => {
            if(doc.exists){
                const userOrder = doc.data();
                lbl_order.addClass("active");
                $(".input-field > label:not(#board-lbl)").addClass("active");
                orderNumberInput.val(userOrder.order_number);
                datePickerOrderDate.setDate(userOrder.order_date);
                datePickerOrderDate.date = userOrder.order_date;
                $("#order_date_picker").val(utils.format(userOrder.order_date));
                if(userOrder.ship_date != undefined){
                    $("#ship_confirmation_yesno").attr('checked', true);
                    datePickerShipDate.setDate(userOrder.ship_date);
                    $("#order_confirmation_date_picker").val(utils.format(userOrder.ship_date));
                    $("#ship_confirmation_container").removeClass("hidden");
                    datePickerShipDate.setDate(userOrder.ship_date);
                    datePickerShipDate.date = userOrder.ship_date;
                }
                if(userOrder.receive_date != undefined){
                    $("#receive_confirmation_yesno").attr('checked', true);
                    datePickerReceivedDate.setDate(userOrder.receive_date);
                    $("#receive_date_picker").val(utils.format(userOrder.receive_date));
                    $("#receive_confirmation_container").removeClass("hidden");
                    datePickerReceivedDate.setDate(userOrder.receive_date);
                    datePickerReceivedDate.date = userOrder.receive_date;
                }
            }
            else{
                //no user account.
            }
          });
        }
    });
}

const utils = {
    numberRegex: RegExp("^#*([0-9]*?x*)$"),
    generateDate:function(date){
        return date === undefined ? "N/A" : this.format(date);
    },
    format:function(date){
        return moment(date.toDate()).format('MMMM Do');
    },
    formatOrderNumber: function(ostring) {
        let regexr = this.numberRegex.exec(ostring);
        if(!regexr || regexr == null || regexr.length < 2 || !regexr[1]) {
            return "N/A";
        } else {
            let match = regexr[1].split("");
            for(let i = match.length; i >= match.length - 3; i--) {
                match[i] = "x";
            }
            return match.join("");
        }
    }
}

/**Event handler*/
$(document).ready(function(){
    $('#order_number').characterCounter();
    shipConfirmationCheckBox = $("#ship_confirmation_yesno");
    receiveCheckBox = $("#receive_confirmation_yesno");
    orderNumberInput = $("#order_number");
    lbl_order = $("#lbl_order");

    $(submit).click(function(){
        const boardId = $('#board_list').find(":selected").attr('value');
        const order = {
            order_number: $("#order_number").val(),
            order_date: datePickerOrderDate.date,
            board_id: boardId,
        }
        if(shipConfirmationCheckBox.is(':checked')){
            if(receiveCheckBox.is(':checked')){
                if(datePickerReceivedDate.date === undefined){
                    M.toast({html: 'Please input the date you received your board'});
                    return;
                }
                else {
                    order.receive_date = datePickerReceivedDate.date;
                }
            }
            if(datePickerShipDate.date == undefined){
                M.toast({html: 'Please input the date you received your email confirmation'});
                return;
            }
            else {
                order.ship_date = datePickerShipDate.date;
            }
        }
        saveOrder(order);
    });

    $("#info").click(function(){
        $(this).removeClass("pulse");
    });

    shipConfirmationCheckBox.change(function(){
        if($(this).is(":checked")){
            $("#ship_confirmation_container").removeClass("hidden");
            datePickerShipDate.open();
        }
        else{
            $("#ship_confirmation_container").addClass("hidden");  
            $("#receive_confirmation_container").addClass("hidden");
            $("#receive_confirmation_yesno").attr("checked", false);
        }
    });

    $("#receive_confirmation_yesno").change(function(){
        if($(this).is(":checked")) {
            $("#receive_confirmation_container").removeClass("hidden");
            datePickerReceivedDate.open();
        }
        else
            $("#receive_confirmation_container").addClass("hidden");
    });

    waitForAuth();
    
   
    M.updateTextFields();
});

// Adapted from https://stackoverflow.com/questions/14267781/sorting-html-table-with-javascript/49041392#49041392
// Sorting
const SortUtils = {
    getCellData: (tr, idx) => {
        return tr.children[idx].getAttribute("data") || tr.children[idx].textContent 
    },
    comparer: (idx, asc) => (a, b) => ((v1, v2) => 
        v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
        )(SortUtils.getCellData(asc ? a : b, idx), SortUtils.getCellData(asc ? b : a, idx))  
}

let t = null;
// do the work...
document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
    const table = th.closest('table');
    t = table.querySelector("tbody");
    Array.from(t.querySelectorAll('tr'))
        .sort(SortUtils.comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
        .forEach(tr => t.appendChild(tr) );
})));
