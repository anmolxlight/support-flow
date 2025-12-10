import { NextRequest, NextResponse } from 'next/server';
import { StripeAgentToolkit } from '@stripe/agent-toolkit/openai';
import { stripe, findCustomerByIdentifier, findPaymentByIdentifier } from '@/lib/stripe';

// Add CORS headers for ElevenLabs webhook calls
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { toolName, parameters } = body;

    if (!toolName) {
      return NextResponse.json(
        { error: 'toolName is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Stripe Agent Toolkit
    const stripeAgentToolkit = new StripeAgentToolkit({
      secretKey,
      configuration: {
        actions: {
          refunds: {
            create: true,
            read: true,
          },
          customers: {
            read: true,
          },
          paymentIntents: {
            read: true,
            update: true,
          },
        },
      },
    });

    // Handle special cases first
    if (toolName === 'refunds_create' || toolName === 'create_refund' || toolName === 'stripe_refunds_create') {
      return await handleRefundRequest(parameters);
    }
    if (toolName === 'paymentIntents_capture' || toolName === 'capture_payment_intent' || toolName === 'stripe_paymentIntents_capture' || toolName === 'capturePaymentIntent' || toolName === 'stripe_capture_payment_intent' || toolName?.includes('capture_payment_intent')) {
      return await handleCaptureRequest(parameters);
    }

    // Get tools and find the matching tool
    const tools = stripeAgentToolkit.getTools();
    const tool = tools.find((t: any) => t.name === toolName);

    if (!tool) {
      // If tool not found, try handling as a custom refund request
      if (toolName.includes('refund')) {
        return await handleRefundRequest(parameters);
      }
      if (toolName.includes('capture')) {
        return await handleCaptureRequest(parameters);
      }
      return NextResponse.json(
        { error: `Tool ${toolName} not found` },
        { status: 404 }
      );
    }

    // Execute the tool using handleToolCall
    // Construct a tool call object in OpenAI format
    const toolCall = {
      id: `call_${Date.now()}`,
      type: 'function' as const,
      function: {
        name: toolName,
        arguments: JSON.stringify(parameters || {}),
      },
    };

    const result = await stripeAgentToolkit.handleToolCall(toolCall);
    
    // Extract the result from the tool message
    const toolResult = result.content;
    
    return NextResponse.json({ result: toolResult }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error calling Stripe tool:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to call Stripe tool' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Handle refund request with customer/order identification
 */
async function handleRefundRequest(parameters: any) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  try {
    const { customerIdentifier, orderIdentifier, amount, reason, metadata } = parameters;

    // If charge_id or payment_intent_id is provided, use it directly
    if (parameters.charge_id) {
      const refund = await stripe.refunds.create({
        charge: parameters.charge_id,
        amount: parameters.amount,
        reason: parameters.reason || 'requested_by_customer',
        metadata: parameters.metadata || {},
      });
      return NextResponse.json({ result: refund }, { headers: corsHeaders });
    }

    if (parameters.payment_intent_id) {
      // Retrieve payment intent to get the charge
      const paymentIntent = await stripe.paymentIntents.retrieve(parameters.payment_intent_id);
      
      if (!paymentIntent.latest_charge) {
        return NextResponse.json(
          { error: 'Payment intent has no charge to refund' },
          { status: 400, headers: corsHeaders }
        );
      }

      const chargeId = typeof paymentIntent.latest_charge === 'string' 
        ? paymentIntent.latest_charge 
        : paymentIntent.latest_charge.id;

      const refund = await stripe.refunds.create({
        charge: chargeId,
        amount: parameters.amount,
        reason: parameters.reason || 'requested_by_customer',
        metadata: parameters.metadata || {},
      });
      return NextResponse.json({ result: refund }, { headers: corsHeaders });
    }

    // If customer or order identifier is provided, find the payment first
    if (customerIdentifier || orderIdentifier) {
      let paymentInfo = null;

      // Try to find by order identifier first
      if (orderIdentifier) {
        paymentInfo = await findPaymentByIdentifier(orderIdentifier);
      }

      // If not found and customer identifier provided, find customer and their payments
      if (!paymentInfo && customerIdentifier) {
        const customer = await findCustomerByIdentifier(customerIdentifier);
        
        if (!customer) {
          return NextResponse.json(
            { error: `Customer not found: ${customerIdentifier}` },
            { status: 404, headers: corsHeaders }
          );
        }

        // Get customer's recent charges
        const charges = await stripe.charges.list({
          customer: customer.id,
          limit: 10,
        });

        if (charges.data.length === 0) {
          return NextResponse.json(
            { error: 'No charges found for this customer' },
            { status: 404, headers: corsHeaders }
          );
        }

        // Use the most recent charge
        const latestCharge = charges.data[0];
        const refund = await stripe.refunds.create({
          charge: latestCharge.id,
          amount: amount,
          reason: reason || 'requested_by_customer',
          metadata: metadata || {},
        });

        return NextResponse.json({ 
          result: refund,
          message: `Refund processed for customer ${customer.id} on charge ${latestCharge.id}`,
        }, { headers: corsHeaders });
      }

      // If payment info found, process refund
      if (paymentInfo) {
        const chargeId = paymentInfo.charge?.id || 
          (paymentInfo.paymentIntent?.latest_charge 
            ? (typeof paymentInfo.paymentIntent.latest_charge === 'string' 
                ? paymentInfo.paymentIntent.latest_charge 
                : paymentInfo.paymentIntent.latest_charge.id)
            : null);

        if (!chargeId) {
          return NextResponse.json(
            { error: 'Could not find charge to refund' },
            { status: 400, headers: corsHeaders }
          );
        }

        const refund = await stripe.refunds.create({
          charge: chargeId,
          amount: amount,
          reason: reason || 'requested_by_customer',
          metadata: metadata || {},
        });

        return NextResponse.json({ 
          result: refund,
          message: `Refund processed for order ${orderIdentifier || 'N/A'}`,
        }, { headers: corsHeaders });
      }
    }

    return NextResponse.json(
      { error: 'Please provide either charge_id, payment_intent_id, customerIdentifier, or orderIdentifier' },
      { status: 400, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error handling refund request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Handle capture payment intent requests (manual capture flows)
 */
async function handleCaptureRequest(parameters: any) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const paymentIntentId =
      parameters.payment_intent_id ||
      parameters.paymentIntentId ||
      parameters.intent_id ||
      parameters.id;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'payment_intent_id is required to capture a payment' },
        { status: 400, headers: corsHeaders }
      );
    }

    const amount =
      typeof parameters.amount === 'number'
        ? parameters.amount
        : parameters.amount
        ? Number(parameters.amount)
        : undefined;

    const captureParams: any = {};
    if (amount && !Number.isNaN(amount)) {
      captureParams.amount_to_capture = Math.round(amount);
    }

    const captured = await stripe.paymentIntents.capture(paymentIntentId, captureParams);
    return NextResponse.json({ result: captured }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error capturing payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture payment intent' },
      { status: 500, headers: corsHeaders }
    );
  }
}

