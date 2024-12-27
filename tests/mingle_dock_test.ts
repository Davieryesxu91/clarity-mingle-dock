import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create a new event",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('mingle-dock', 'create-event', [
                types.ascii("Tech Meetup"),
                types.ascii("A meetup for tech professionals"),
                types.uint(1625097600), // July 1, 2021
                types.uint(50)
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectOk();
        assertEquals(block.receipts[0].result.expectOk(), types.uint(1));
    }
});

Clarinet.test({
    name: "Can register for an event",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        
        // First create an event
        let block = chain.mineBlock([
            Tx.contractCall('mingle-dock', 'create-event', [
                types.ascii("Tech Meetup"),
                types.ascii("A meetup for tech professionals"),
                types.uint(1625097600),
                types.uint(50)
            ], deployer.address)
        ]);
        
        // Then register for it
        let registerBlock = chain.mineBlock([
            Tx.contractCall('mingle-dock', 'register-for-event', [
                types.uint(1)
            ], user1.address)
        ]);
        
        registerBlock.receipts[0].result.expectOk();
        
        // Verify registration
        let statusBlock = chain.mineBlock([
            Tx.contractCall('mingle-dock', 'get-registration-status', [
                types.uint(1),
                types.principal(user1.address)
            ], user1.address)
        ]);
        
        const registration = statusBlock.receipts[0].result.expectSome();
        assertEquals(registration.registered, true);
        assertEquals(registration.checked-in, false);
    }
});

Clarinet.test({
    name: "Only organizer can check in attendees",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        
        // Create event and register
        let setupBlock = chain.mineBlock([
            Tx.contractCall('mingle-dock', 'create-event', [
                types.ascii("Tech Meetup"),
                types.ascii("A meetup for tech professionals"),
                types.uint(1625097600),
                types.uint(50)
            ], deployer.address),
            Tx.contractCall('mingle-dock', 'register-for-event', [
                types.uint(1)
            ], user1.address)
        ]);
        
        // Try to check in from non-organizer
        let failedCheckIn = chain.mineBlock([
            Tx.contractCall('mingle-dock', 'check-in', [
                types.uint(1),
                types.principal(user1.address)
            ], user2.address)
        ]);
        
        failedCheckIn.receipts[0].result.expectErr(types.uint(100)); // err-owner-only
        
        // Check in from organizer should succeed
        let successCheckIn = chain.mineBlock([
            Tx.contractCall('mingle-dock', 'check-in', [
                types.uint(1),
                types.principal(user1.address)
            ], deployer.address)
        ]);
        
        successCheckIn.receipts[0].result.expectOk();
    }
});