var SUPPLY_TABLE = '<div class="table-wrapper table-responsive mt-2">\
                        <table class="table table-sm table-striped">\
                            <thead>\
                                <th></th>\
                                <th>Destination</th>\
                                <th>Product</th>\
                                <th>Number of pieces</th>\
                                <th>Consumption per piece</th>\
                                <th>Total consumption</th>\
                                <th>Safety margin (%)</th>\
                                <th>Theoritical order</th>\
                                <th>Minimum order quantity</th>\
                                <th>ORDER</th>\
                                <th>Stock at destination</th>\
                                <th>Internal referance</th>\
                                <th></th>\
                            </thead>\
                            <tbody class="tbody-supply-order-section">\
                            </tbody>\
                        </table>\
                    </div>'
var SUPPLIERE_CONTENT = {}

window.onload = function(){
    $(".client-modal-link").css("color","#3B3DBF");
    $('.sum-quantity').each(function(){
        let item = $(this).attr('data-item');
        let size = $(this).attr('data-size');
        let sum = get_sum(item,size);
        $(this).text(sum);
    });
    $('.total-sum').each(function(){
        let item = $(this).attr('data-item');
        let total_sum = get_total_sum(item);
        $(this).text("Total : "+total_sum.toString());
    });
    $(".default-hide").hide().find('input').prop('disabled', true)
}

$(".client-modal-link").click(function(){
    let data_array = ["country","city","phone","email","cusname"];
    for (let k=0;k<data_array.length;k++){
        $("#modal-"+data_array[k]).text($(this).attr("data-"+data_array[k]));
    }
    $("#client-modal").modal('show');
});

$("input[type='checkbox']").change(function(){
    if($(this).attr('data-check_type')=="select-all"){
        return null
    }
    if ($(this).is(':checked')){
        $("."+ $(this).attr('data-order_count')+"-qnty-content-class").each(function(){
            $(this).attr('contenteditable','true').keypress(function(e) {
                if (isNaN(String.fromCharCode(e.which)) || e.which == 32) e.preventDefault();
            });
            $(this).addClass("background-ash");
        })
    }
    else{
        $("."+ $(this).attr('data-order_count')+"-qnty-content-class").each(function(){
            $(this).attr('contenteditable','false');
            $(this).html($(this).attr("data-current_qty"));
            $(this).removeClass("background-ash");
        })
    }
})

function set_modify(item){
    $('.modify-show-'+item).show().find('input').prop('disabled', false)
    $('.modify-hide-'+item).hide().find('input').prop('disabled', true)
}

function cancel_modify(item){
    $('input:checkbox').prop('checked', false).change();
    $('.modify-show-'+item).hide().find('input').prop('disabled', true)
    $('.modify-hide-'+item).show().find('input').prop('disabled', false)
}

function modify(item){
    let order = collect_data_for_modify(item);
    cancel_modify(item)
    if (order==null){
        response_message('Unsuccessfull', 'Incomplete data !', 'red')
        return null
    }
    frappe.call({
        method: 'erpnext.modehero.sales_order.modify_sales_item_orders',
        args: {
            orders_object:order
        },
        callback: function (r) {
            if (r) {
                if (r.message['status'] == "ok") {
                    response_message('Successfull', 'Orders updated successfully', 'green')
                    window.location.reload()
                    return null;
                }
                response_message('Unsuccessfull', 'Orders updated unsuccessfully', 'red')
                window.location.reload()
                return null
            }
            response_message('Unsuccessfull', 'Orders updated unsuccessfully', 'red')
        }
    });
}

async function validate(item){
    let order = collect_data_for_validate(item);
    if (order==null){
        response_message('Unsuccessfull', 'Incomplete data !', 'red')
        return null
    }
    else if(order=="select_all_error"){
        response_message('Unsuccessfull', 'All orders of the block should be selected before validation !', 'red')
        return null
    }
    else if(order=="factory_error"){
        response_message('Unsuccessfull', 'Factory is not selected !', 'red')
        return null
    }

    let total_order_count = await get_total_order_detail(order)
    if (total_order_count==null){
        console.log("++++>total order")
        return null
    }
    set_supply_order_section(item,order,total_order_count)
    
    // frappe.call({
    //     method: 'erpnext.modehero.sales_order.validate_sales_item_orders',
    //     args: {
    //         orders_object:order.order
    //     },
    //     callback: function (r) {
    //         if (r) {
    //             if (r.message['status'] == "ok") {
    //                 response_message('Successfull', 'Orders validated successfully', 'green')
    //                 window.location.reload()
    //                 return null;
    //             }
    //             response_message('Unsuccessfull', 'Orders validated unsuccessfully', 'red')
    //             window.location.reload()
    //             return null
    //         }
    //         response_message('Unsuccessfull', 'Orders validated unsuccessfully', 'red')
    //     }
    // });
}

function cancel(item){
    let orders = []
    $("tr[data-item_code|='"+item+"']").each(function(){
        let order_name = $(this).attr('data-order');
        orders.push(order_name);
    })

    $('input:checkbox').prop('checked', false);
    frappe.call({
        method: 'erpnext.modehero.sales_order.cancel_sales_item_orders',
        args: {
            item_order_list:orders
        },
        callback: function (r) {
            if (r) {
                if (r.message['status'] == "ok") {
                    response_message('Successfull', 'Orders canceled successfully', 'green')
                    window.location.reload()
                    return null;
                }
                response_message('Unsuccessfull', 'Orders canceled unsuccessfully', 'red')
                window.location.reload()
                return null
            }
            response_message('Unsuccessfull', 'Orders canceled unsuccessfully', 'red')
        }
    });
}

function collect_data_for_validate(item){
    let order = {}
    let is_any_empty = false;
    if (!$(".factory-select[data-item_code|='"+item+"']").val()){
        return "factory_error"
    }

    $("tr[data-item_code|='"+item+"']").each(function(){
        let order_name = $(this).attr('data-order');
        let order_count = $(this).attr('data-order_count');

        order[order_name]={"client_name":$(this).attr("data-client_name"),"sizes":{}}

        $("."+ order_count +"-qnty-content-class").each(function(){
            let size_type = $(this).attr('data-size');
            if ($(this).text().trim().length==0){
                is_any_empty = true;
                return false;
            }
            if (!(isNaN($(this).text()))){
                if ( order[order_name]==undefined){
                    order[order_name]={}
                    order[order_name]["sizes"]={}
                }
                order[order_name]["sizes"][size_type]= parseInt($(this).text());
            }
        })     
    })
    let factory = $(".factory-select[data-item_code|='"+item+"']").val()
    let full_data = {"factory_name":$("option[value|='"+factory+"']").attr("data-factory_name") ,"factory":factory,"order":order}
    $('input:checkbox').prop('checked', false).change();
    if (is_any_empty){
        return null
    }
    if(Object.keys(full_data.order).length==0){
        return null
    }
    return full_data
}


function collect_data_for_modify(item){
    let is_any_checked = false;
    let is_any_empty = false;
    $(".sales-order-checkbox[data-item_code|='"+item+"']").each(function(){
        if ($(this).is(':checked')){
            is_any_checked = true;
        }
    });
    if (!is_any_checked){
        return null;
    }
    let order = {}
    $(".sales-order-checkbox[data-item_code|='"+item+"']").each(function(){
        if ($(this).is(':checked')){
            let order_name = $(this).attr('data-order');
            let order_count = $(this).attr('data-order_count');

            $("."+ order_count +"-qnty-content-class").each(function(){
                let size_type = $(this).attr('data-size');
                if ($(this).text().trim().length==0){
                    is_any_empty = true;
                    return false;
                }
                if (!(isNaN($(this).text()))&&($(this).attr("data-current_qty") !=  $(this).text())){
                    if ( order[order_name]==undefined){
                        order[order_name]={}
                        order[order_name]["sizes"]={}
                    }
                    order[order_name]["sizes"][size_type]= parseInt($(this).text());
                }
            })
        }        
    })

    $('input:checkbox').prop('checked', false).change();
    if (is_any_empty){
        return null
    }
    if(Object.keys(order).length==0){
        return null
    }
    return order
}

async function set_supply_order_section(item,order,total_order_count){
    let item_details = null
    await frappe.call({
        method: 'erpnext.modehero.product.get_product_item',
        args: {
            product:item
        },
        callback: function (r) {
            if (!r.exc) {
                item_details= r.message
                return null
            }
            response_message('Unsuccessfull', 'Error !', 'red')
            return null
        }
    });

    if (item_details!=null){
        change_supplier_division(item_details,order,total_order_count)
    }
}

async function change_supplier_division(item,order,total_order_count){
    let supplieres = item.supplier
    for (let i=0;i<supplieres.length;i++){
        let supplier_detail = await get_supplier_details(supplieres[i].supplier).then()
        console.log(supplier_detail)
        if (supplier_detail==null){
            console.log("+++++> null supp detail")
            continue
        }
        await create_supply_table_head(supplier_detail)
        if (!SUPPLIERE_CONTENT.hasOwnProperty(supplier_detail.name)){
            SUPPLIERE_CONTENT[supplier_detail.name] = []
        }
        let tbody_element = $(".suppliere-block[data-supplier|='"+supplier_detail.name+"'] > .table-wrapper > table > .tbody-supply-order-section")
        await add_supply_block_table_body(tbody_element,supplier_detail,supplieres[i],item,order,total_order_count)
    }
    $(".numeric-editable").keypress(function(e) {
        if (isNaN(String.fromCharCode(e.which)) || e.which == 32) e.preventDefault();
    });
}

async function create_supply_table_head(supplier_detail){
    if ($(".suppliere-block[data-supplier|='"+supplier_detail.name+"']").length==0){
        let markup = '<div class="suppliere-block" data-supplier="'+supplier_detail.name+'" >\
                        <h3>'+supplier_detail.supplier_name+'</h3>\
                      </div>'
        $("#supply-order-section").append(markup)
        $(".suppliere-block[data-supplier|='"+supplier_detail.name+"']").append(SUPPLY_TABLE)
    }
}

async function get_supplier_details(item_supplier_ref){
    let suppliere = null
    await frappe.call({
        method: 'erpnext.modehero.supplier.get_supplier',
        args: {
            suppier_ref:item_supplier_ref
        },
        callback: function (r) {
            if (!r.exc) {
                suppliere= r.message
                return null
            }
            response_message('Unsuccessfull', 'Error !', 'red')
            return null
        }
    });
    return suppliere
}

async function add_supply_block_table_body(tbody_element,supplier,item_supplier_obj,item,order,total_order_count){
    let consumption_per_piece = await get_consumption(item_supplier_obj).then()
    if (consumption_per_piece==null){
        console.log("++++> null cpp")
        return null
    }
    let stock = await get_stock(supplier)
    if (stock==null){
        console.log("++++> null stock")
        return null
    }
    let moq = await get_moq(item_supplier_obj)
    if (moq==null){
        console.log("++++> null moq", item_supplier_obj.packaging_ref, item_supplier_obj.trimming_ref, item_supplier_obj.fabric_ref)
        return null
    }
    
    let markup = '\
    <tr class="data-row" data-suppliere_row_item="'+item.name+'"  data-destination="'+order.factory+'">\
        <td class="select-box-supply-product"><input type="checkbox"/></td>\
        <td class="destination-supply-product">'+order.factory_name+'</td>\
        <td class="product-supply-product">'+item.item_name+'</td>\
        <td class="nop-supply-product">'+total_order_count+'</td>\
        <td class="cpp-supply-product">'+consumption_per_piece+'</td>\
        <td class="tc-supply-product">'+Number(consumption_per_piece)*Number(total_order_count)+'</td>\
        <td class="sm-supply-product" ><span class="background-ash numeric-editable" contenteditable="true">5</span></td>\
        <td class="to-supply-product">'+(Number(consumption_per_piece)*Number(total_order_count)*1.05).toFixed(2)+'</td>\
        <td class="moq-supply-product">'+moq+'</td>\
        <td class="order-supply-prodcut" ><span class="background-ash" contenteditable="true"> </span></td>\
        <td class="sat-supply-product">'+stock+'</td>\
        <td class="if-supply-product" ><span class="background-ash" contenteditable="true"> </span></td>\
        <td class="reminder-supply-product"></td>\
    </tr>'
    if (SUPPLIERE_CONTENT[supplier.name].indexOf(order.factory)==-1){
        SUPPLIERE_CONTENT[supplier.name].push(order.factory)
        tbody_element.append(markup)
        tbody_element.children(".data-row").children(".sm-supply-product").children(".numeric-editable").on('input',function(e){
            set_theoritical_order_of_row(tbody_element.children(".data-row"),Number(consumption_per_piece)*Number(total_order_count))
        })
    }else{
        tbody_element.children(".data-row[data-destination|='"+order.factory+"']").last().after(markup)
        add_summary_row(tbody_element,order.factory,stock,moq,item.name)
    }
}

function add_summary_row(tbody_element,destination,stock,moq,item){
    let to = 0
    $(".data-row[data-destination|='"+destination+"']").each(function(){
        $(this).children(".order-supply-prodcut").empty()
        $(this).children(".if-supply-product").empty()        
        $(this).children(".select-box-supply-product").empty() 
        to = to + Number($(this).children(".to-supply-product").text())
    })
    let markup = '\
    <tr class="summary-row data-row" data-suppliere_row_item="'+item+'"  data-destination="'+destination+'">\
        <td class="select-box-supply-product"><input type="checkbox"/></td>\
        <td class="destination-supply-product"></td>\
        <td class="product-supply-product"></td>\
        <td class="nop-supply-product"></td>\
        <td class="cpp-supply-product"></td>\
        <td class="tc-supply-product"></td>\
        <td class="sm-supply-product" ></td>\
        <td class="to-supply-product">'+to+'</td>\
        <td class="moq-supply-product">'+moq+'</td>\
        <td class="order-supply-prodcut" ><span class="background-ash" contenteditable="true"> </span></td>\
        <td class="sat-supply-product">'+stock+'</td>\
        <td class="if-supply-product" ><span class="background-ash" contenteditable="true"> </span></td>\
        <td class="reminder-supply-product"></td>\
    </tr>'
    tbody_element.children(".data-row[data-destination|='"+destination+"']").last().after(markup)
}

async function get_moq(item_supplier_obj){
    let ref = await get_supply_item_ref(item_supplier_obj).then()
    if (ref==null ||ref=="" ){
        return null
    }
    let moq = null
    await frappe.call({
        method: 'erpnext.modehero.supplier.get_moq',
        args: {
            supply_ref:ref,
            supply_type:item_supplier_obj.supplier_group
        },
        callback: function (r) {
            if (!r.exc) {
                moq= r.message
                return null
            }
            response_message('Unsuccessfull', 'Error !', 'red')
            return null
        }
    });
    return moq
}

async function get_supply_item_ref(item_supplier_obj){
    let type = item_supplier_obj.supplier_group
    let supp_item = null
    if (type=="Packaging"){
        supp_item = item_supplier_obj.packaging_ref
    }else if (type=="Trimming"){
        supp_item = item_supplier_obj.trimming_ref
    }else if (type=="Fabric"){
        supp_item = item_supplier_obj.fabric_ref
    }
    if (supp_item==null || supp_item ==""){
        return null
    }else{
        return supp_item
    }
}

function set_theoritical_order_of_row(table_row,total_consumption){
    let rate = Number(table_row.children(".sm-supply-product").children(".numeric-editable").text())
    if (rate==""||rate==null){
        table_row.children(".to-supply-product").text(0)
    }
    table_row.children(".to-supply-product").text(((rate+100)/100*total_consumption).toFixed(2))
}

async function get_consumption(item_supplier_obj){
    let type = item_supplier_obj.supplier_group
    let cpp = null
    if (type=="Packaging"){
        cpp = item_supplier_obj.packaging_consumption
    }else if (type=="Trimming"){
        cpp = item_supplier_obj.trimming_consumption
    }else if (type=="Fabric"){
        cpp = item_supplier_obj.fabric_consumption
    }
    if (cpp==null || cpp ==""){
        return null
    }else{
        return cpp
    }
}

async function get_stock(supplier){
    let stock = null
    await frappe.call({
        method: 'erpnext.modehero.stock.get_stock',
        args: {
            item_type:supplier.supplier_group.toLowerCase(),
            ref:supplier.name
        },
        callback: function (r) {
            if (!r.exc) {
                stock= r.message
                return null
            }
            response_message('Unsuccessfull', 'Error !', 'red')
            return null
        }
    });
    return stock.quantity
}

async function get_total_order_detail(order){
    let sales_order_collection = []
    for (const sales_order_item in order.order){
        sales_order_collection.push(sales_order_item)
    }
    let total_prodcts = null
    await frappe.call({
        method: 'erpnext.modehero.sales_order.get_total_products',
        args: {
            order_list:sales_order_collection
        },
        callback: function (r) {
            if (!r.exc) {
                total_prodcts= r.message
                return null
            }
            response_message('Unsuccessfull', 'Error !', 'red')
            return null
        }
    });
    return total_prodcts
}

function select_all_chekbox(item) {
    if ($(".select-all-sales-orders[data-item_code|='"+item+"']").is(':checked')) {
        $(".sales-order-checkbox[data-item_code|='"+item+"']").prop('checked', true).change();
    } else {
        $(".sales-order-checkbox[data-item_code|='"+item+"']").prop('checked', false).change();
    }
}

function get_total_sum(itm_code){
    let sum = 0;
    $(".sum-quantity[data-item|='"+itm_code+"']").each(function() {
        sum = sum + Number($( this ).text());
    });
    return sum
}

function get_sum(itm_code,size){
    let sum = 0
    $(".qnty-content-class[data-item_code|='"+itm_code+"'][data-size|='"+size+"']").each(function() {
        sum = sum + Number($( this ).attr('data-current_qty'));
    });
    return sum
}

function response_message(title, message, color) {
    frappe.msgprint({
        title: __(title),
        indicator: color,
        message: __(message)
    });
}