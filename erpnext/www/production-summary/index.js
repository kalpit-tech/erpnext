var tablecount = 1;
var profoma = null;
var numeric = /^\d+$/;

$('.close').click(e => console.log($(e.target).parent()))

const productUpdateCallback = (e) => {
    // console.log($(e.target).parent().parent().parent().parent().find('.table-section')[0])
    product = $(e.target).find("option:selected").val()
    $(e.target).closest('.product-table').attr('id', product)
    frappe.call({
        method: 'erpnext.stock.sizing.getSizes',
        args: {
            item: product
        },
        callback: function (r) {
            if (!r.exc) {
                let table = generateSizingTable(r.message.sizes)
                // console.log(table)
                $(e.target).parent().parent().parent().parent().find('.table-section').html(table)
                {% if isCustomer and not isBrand %}
                $('.modified-qty>td>input').attr('disabled', true)
                {% endif %}
                $('.qty>td>input').change(priceUpdateCallback)
            }
        }
    });
}

$('.selected-product').click(productUpdateCallback)

function generateSizingTable(sizes) {

    let heads = '', inputs = ''

    sizes.map(s => {
        heads += `<th class="sizing" scope="col">${s}</th>`
        inputs += `<td><input type="text" data-size="${s}" class="form-control"></td>`
    })

    return `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th scope="col">{{_("Sizing")}}</th>
                        ${heads}
                    </tr>
                </thead>
                <tbody>
                    <tr class="qty">
                        <th class="qty" scope="row">{{_("Quantity")}}</th>
                        ${inputs}
                    </tr>
                </tbody>
            </table>
    `
}

const cleartable = () => $('.table-section').html('')

const setClose = () => {
    $('.close').click(e => {
        if (tablecount > 1) {
            $(e.target).parent().parent().parent().remove()
            tablecount--
        }
    })
}

setClose()


$('#submit').click(() => {
    let products = {}
    let garmentlabel = $('#garmentlabel>option:selected').val()
    let allnull = true
    $('.product-table').map(function () {
        let product = $($(this).find('.selected-product')[0]).find('option:selected').text()
        let destination = $($(this).find('.destination')[0]).find('option:selected').text()

        let qtys = {}
        let sizes = []
        let counter = 0

        $(this).find('.sizing').map(function () {
            sizes.push($(this).text())
        })

        $(this).find('.qty>td>input').map(function () {
            if ($(this).val() != "") {
                allnull = false
            }
            // qtys.push($(this).val())
            qtys[sizes[counter++]] = $(this).val()
        })

        products[product] = {
            item: product,
            destination,
            quantities: qtys
        }
    })

    console.log(products, garmentlabel)
    if (allnull) {
        frappe.throw(frappe._("Please fill quantities"))
    }
    frappe.call({
        method: 'erpnext.modehero.sales_order.create_sales_order',
        args: {
            items: products,
            garmentlabel,
            internalref: $('#internal-ref').val(),
            profoma
        },
        callback: function (r) {
            if (!r.exc) {
                console.log(r)
                let order = r.message.order
                if (order && order.name) {
                    $('#order-no').html(order.name)
                    frappe.msgprint({
                        title: __('Notification'),
                        indicator: 'green',
                        message: __('Sales order ' + order.name + ' created successfully')
                    });
                }
            }
        }
    })

})

$('#validate').click(function () {
    let order = $('#order-no').text().trim()
    frappe.call({
        method: 'erpnext.modehero.production.validate',
        args: {
            order,
            isvalidate: true
        },
        callback: function (r) {
            if (!r.exc) {
                console.log(r)
                frappe.msgprint(__('Order Validated'))
            }
        }
    })
})

$('#upload-profoma').click(function () {
    let file = $('#profoma').prop('files')[0]
    if (file.size / 1024 / 1024 > 5) {
        frappe.throw("Please upload file less than 5mb")
        return
    }
    var reader = new FileReader();
    reader.readAsDataURL(file);
    console.log(file, reader, reader.result)
    reader.onload = function () {
        frappe.call({
            method: 'frappe.handler.uploadfile',
            // method: 'erpnext.modehero.sales_order.upload_test',
            args: {
                filename: file.name,
                attached_to_doctype: 'Sales Order',
                attached_to_field: profoma,
                is_private: true,
                filedata: reader.result,
                from_form: true,
            },
            callback: function (r) {
                if (!r.exc) {
                    console.log(r)
                    frappe.msgprint("File successfully uploaded")
                    $('#profoma-label').html(r.message.file_url)
                    profoma = r.message.file_url
                }
            }
        })

    }

})

function priceUpdateCallback(e) {
    // console.log(e.target.value, $(e.target).attr('data-size'))
    if (!numeric.test(e.target.value)) {
        $(e.target).css('border-color', 'red')
    } else {

        let products = {}

        //calculate price 
        $('.product-table').map(function () {
            let product = $(this).find('.selected-product>option:selected').val()

            $(this).find('.qty>td').map(function () {
                let qty = $(this).find('input').val()
                let size = $(this).find('input').attr('data-size')

                if (!products[product]) {
                    products[product] = {}
                }
                if (qty != '') {
                    products[product][size] = qty
                }
            })

        })
        console.log(products)

        $(e.target).css('border', '1px solid #ced4da')
        calculatePrice(products)
    }
}

function calculatePrice(products) {
    frappe.call({
        method: 'erpnext.modehero.sales_order.calculate_price',
        args: {
            products
        },
        callback: function (r) {
            if (!r.exc) {
                console.log(r.message)
                $('#total').html(r.message.total)
                let prices = r.message
                for (let p in prices) {
                    $(`#${p}`).find('.pricing-table .total-price').html(prices[p])
                    $(`#${p}`).find('.pricing-table .price-pp').html(prices.perpiece[p])
                    $(`#${p}`).find('.pricing-table .total-order').html(prices.total)
                }
            }
        }
    })
}

function calculatePriceOnLoad() {
    let products = {}
    $('.product-table').map(function () {
        let product = $(this).find('.product').attr('data-product')
        $(this).find('.qty>td').map(function () {
            let qty = $(this).html().trim()
            let size = $(this).attr('data-size')

            if (!products[product]) {
                products[product] = {}
            }
            if (qty != '') {
                products[product][size] = qty
            }
        })
    })
    console.log(products)
    calculatePrice(products)
}

{% if order %}
setTimeout(() => {
    calculatePriceOnLoad()
}, 500);
{% endif %}


$('#prodSubmit').click(function () {
    let files = ['confirmation_doc', 'profoma', 'invoice']

    Promise.all(files.map(f => {
        return checkFileUpload(f)
    })).then(files => {
        console.log(files);
        submitProductionSummary(files);

    }).catch(e => {
        frappe.throw(e)
    })

});

function checkFileUpload(componentId) {
    return new Promise((resolve, reject) => {
        let file = $(`#${componentId}`).prop('files')[0]
        switch (componentId) {
            case "confirmation_doc":

                if (!file) {
                    if ("{{order.confirmation_doc}}" == null) {
                        console.error('confirmation doc must upload');

                    } else {
                        filename = "{{order.confirmation_doc}}";
                        resolve(filename);
                    }

                } else {
                    uploadFile(componentId).then(res => resolve(res));

                }
                break;
            case "profoma":

                if (!file) {
                    if ("{{order.profoma}}" == null) {
                        console.error('profoma must upload');

                    } else {
                        filename = "{{order.profoma}}";
                        resolve(filename);
                    }

                } else {
                    uploadFile(componentId).then(res => resolve(res));

                }

                break;
            case "invoice":

                if (!file) {
                    if ("{{order.invoice}}" == null) {
                        console.error('invoice must upload');

                    } else {
                        filename = "{{order.invoice}}";
                        resolve(filename);
                    }

                } else {
                    uploadFile(componentId).then(res => resolve(res));

                }

                break;

            case "payment_proof":

                if (!file) {
                    if ("{{order.payment_proof}}" == null) {
                        console.error('invoice must upload');

                    } else {
                        filename = "{{order.payment_proof}}";
                        resolve(filename);
                    }

                } else {
                    uploadFile(componentId).then(res => resolve(res));

                }

                break;


        }

    })

}

function submitProductionSummary(files) {
    frappe.call({
        method: 'erpnext.modehero.production.submit_production_summary_info',
        args: {
            data: {
                order: "{{frappe.form_dict.order}}",
                ex_work_date: $('#exWorkDate').val(),
                confirmation_doc: files[0],
                profoma: files[1],
                invoice: files[2],
                carrier: $('#carrier').val(),
                tracking_number: $('#tracking_number').val(),
                shipment_date: $('#shipmentDate').val(),
                price:$('#price').val(),
                production_comment: $('#comment').val(),
            }
        },
        callback: function (r) {
            if (!r.exc) {
                console.log(r)
                frappe.msgprint({
                    title: __('Notification'),
                    indicator: 'green',
                    message: __('Production order ' + "{{order.name}}" + ' summary created successfully')
                });
                location.reload()

            } else {
                frappe.msgprint({
                    title: __('Notification'),
                    indicator: 'red',
                    message: __('Production order ' + "{{order.name}}" + ' summary created Failed')
                });
            }
        }
    })

}

function uploadFile(componentId) {
    return new Promise((resolve, reject) => {
        let file = $(`#${componentId}`).prop('files')[0]
        if (file.size / 1024 / 1024 > 5) {
            reject("Please upload file less than 5mb")
        }
        var reader = new FileReader();
        reader.readAsDataURL(file);
        console.log(file, reader, reader.result)
        reader.onload = function () {
            frappe.call({
                method: 'frappe.handler.uploadfile',
                // method: 'erpnext.modehero.sales_order.upload_test',
                args: {
                    filename: file.name,
                    attached_to_doctype: 'Production Order',
                    attached_to_field: componentId,
                    is_private: true,
                    filedata: reader.result,
                    from_form: true,
                },
                callback: function (r) {
                    if (!r.exc) {
                        console.log(r)
                        $(`#${componentId}-label`).html(r.message.file_url)
                        resolve(r.message.file_url)
                    }
                }
            })

        }
    })

}

$('#confirmation_doc').change(function () {
    $('#confirmation_doc-label').html($(this).prop('files')[0].name)
})

$('#profoma').change(function () {
    $('#profoma-label').html($(this).prop('files')[0].name)
})

$('#invoice').change(function () {
    $('#invoice-label').html($(this).prop('files')[0].name)
})

$('.fabsuppliers').click(function () {
    window.location.href = `/fabric-item?name=` + $(this).data('ref')
})

$('.trimsuppliers').click(function () {
    window.location.href = `/trimming-item?name=` + $(this).data('ref')
})

$('.packsuppliers').click(function () {
    window.location.href = `/packaging-item?name=` + $(this).data('ref')
})

$('#payment_proof').change(function () {
    $('#payment_proof-label').html($(this).prop('files')[0].name)
    uploadPaymentProofFile()
})

function uploadPaymentProofFile(){
    let files = ['payment_proof']

    Promise.all(files.map(f => {

        return checkFileUpload(f)

    })).then(files => {
        console.log(files);
        submitPaymentProof(files)

    }).catch(e => {

        frappe.throw(e)
    })
}



function submitPaymentProof(files) {
    frappe.call({
        method: 'erpnext.modehero.production.submitPaymentProof',
        args: {
            data: {
                order: "{{frappe.form_dict.order}}",
                payment_proof: files[0]

            }
        },
        callback: function (r) {
            if (!r.exc) {
                console.log(r)
                element = `<a href="`+r.message.payment_proof+`" download class="order-summary-download" style="padding-bottom: 0%;width:112%">
                <img src="/assets/erpnext/images/icons/pdf.svg" alt="" style="margin-top:0%;"/>
                <span>`+r.message.payment_proof+`</span>
                </a>`

                $('#payment_doc').html(element)
                frappe.msgprint({
                    title: __('Notification'),
                    indicator: 'green',
                    message: __('Payment Proof Submitted Successfully')
                });

            } else {
                frappe.msgprint({
                    title: __('Notification'),
                    indicator: 'red',
                    message: __('Payment Proof Submission Failed')
                });
            }
        }
    })

}


$(document).ready(function(){
    setTimeout(() => {
        makeSizeTable()
    }, 1000);
    
    
})

function makeSizeTable() {
    var sizes = $('#sizeTable').html()
    $('#size_table').replaceWith(sizes)
}

$('#pdf_doc').click(function () {
    
    let page=$('#doc').html()
    render_pdf(page)
})

function render_pdf(html) {
    var formData = new FormData();

	//Push the HTML content into an element
    formData.append("html",html);
    // if (opts.orientation) {
	// 	formData.append("orientation", opts.orientation);
	// }
	var blob = new Blob([], { type: "text/xml"});
	formData.append("blob", blob);

    var xhr = new XMLHttpRequest();
    $("#container").css("opacity",0.5);
	xhr.open("POST", '/api/method/frappe.utils.print_format.report_to_pdf');
	xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);
    xhr.responseType = "arraybuffer";
    
	xhr.onload = function(success) {
		if (this.status === 200) {
            $("#container").css("opacity",1);
			var blob = new Blob([success.currentTarget.response], {type: "application/pdf"});
            var objectUrl = URL.createObjectURL(blob);
            window.open(objectUrl);
            // target=`<a href="${objectUrl}">${objectUrl}</a>`
            // $('#order_doc').html(target)

			
			//Open report in a new window
			// window.open(objectUrl);
        }
        else{
            frappe.msgprint({
              title: __("Notification"),
              indicator: "red",
              message: __(
                "Not Permitted"
              ),
            });
            $(".row").css("opacity",1);
          }
    };
    
    xhr.send(formData);
}
