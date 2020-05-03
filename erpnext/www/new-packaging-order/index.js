$('#new_packaging_order').submit(function(event) {
    event.preventDefault();
    var $inputs = $('#new_packaging_order :input');
    var values = {};
    $inputs.each(function() {
        values[this.name] = $(this).val();
    }); 
    validation_report = validate_form(values)
    if (validation_report.status!="ok"){
        frappe.msgprint({
            title: __('Error'),
            indicator: 'red',
            message: __(validation_report.message)
        });
        return null
    }
    // Here supply group is taken from the data-group attribute given from the button of the sidebar
    create_fabric_order(values)
});

function validate_form(input){

    for (var key of Object.keys(input)) {   
        if (key != "" && key != "shipment_date" && key != "reception_date" && key != "payment_date" && key != "confirmation_date" && key != "proforma_date"  && String(input[key]).trim() == "") {
            return {status:"not" , message:"Please fill all required fields!"}
        }
    }
    if (isNaN(input['quantity']) || isNaN(input['stock']) || isNaN(input['price_per_unit']) || isNaN(input['total_price'])){
        return {status:"not" , message:"Please enter correct inputs!"}
    }
    return {status:"ok" , message:"Succesfull!"}
}

function create_fabric_order(data){
    frappe.call({
        method: 'erpnext.modehero.package.create_packaging_order',
        args: {
            data: {
                packaging_vendor : data.packaging_vendor,
                internal_ref : data.internal_ref,
                packaging_item : data.packaging_item,
                item_code : data.product_name,
                production_factory : data.production_factory,
                quantity : data.quantity,
                in_stock : data.stock,
                price_per_unit : data.price_per_unit,
                total_price : data.total_price,
                profoma_reminder : data.proforma_date,
                confirmation_reminder : data.confirmation_date,
                payment_reminder : data.payment_date,
                reception_reminder : data.reception_date,
                shipment_reminder : data.shipment_date
            }
        },
        callback: function (r) {
            if (!r.exc) {
                console.log(r)
                let order = r.message.order
                if (order && order.name) {
                    frappe.msgprint({
                        title: __('Notification'),
                        indicator: 'green',
                        message: __('Packaging order created successfully')
                    });
                }
            }
        }
    })
}