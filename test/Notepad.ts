import { expect } from "chai";
import hre from "hardhat";

describe("Notepad Contract", function () {
  async function deployNotepadFixture() {
    const [owner, user1, user2, user3] = await hre.ethers.getSigners();
    const Notepad = await hre.ethers.getContractFactory("Notepad");
    const notepad = await Notepad.deploy();
    return { notepad, owner, user1, user2, user3 };
  }

  describe("Add and Manage Notes", function () {
    it("Should allow a user to add a note", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("My first note");
      const userNotes = await notepad.connect(user1).getUserNoteAmount();
      expect(userNotes.length).to.equal(1);
      expect(await notepad.connect(user1).getSharedNote(1)).to.equal("My first note");
    });

    it("Should emit NoteCreated event on note creation", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await expect(notepad.connect(user1).addNote("My second note"))
        .to.emit(notepad, "NoteCreated")
        .withArgs(1, user1.address);
    });

    it("Should allow the creator to delete their note", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note to be deleted");
      await notepad.connect(user1).deleteNote(1);
      const userNotes = await notepad.connect(user1).getUserNoteAmount();
      expect(userNotes.length).to.equal(0);
    });

    it("Should not allow others to delete the note", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note that cannot be deleted by others");
      await expect(notepad.connect(user2).deleteNote(1)).to.be.revertedWithCustomError(
        notepad,
        "NotCreator"
      );
    });

    it("Should revert if trying to delete a non-existing note", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await expect(notepad.connect(user1).deleteNote(999)).to.be.revertedWith("Note does not exist");
    });

    it("Should allow a user to add multiple notes", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note 1");
      await notepad.connect(user1).addNote("Note 2");
      const userNotes = await notepad.connect(user1).getUserNoteAmount();
      expect(userNotes.length).to.equal(2);
    });

    it("Should allow creation of a note with empty content", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("");
      const userNotes = await notepad.connect(user1).getUserNoteAmount();
      expect(userNotes.length).to.equal(1);
      expect(await notepad.connect(user1).getSharedNote(1)).to.equal("");
    });

    it("Should allow creation of a note with special characters", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      const specialNote = "This is a special note! @#&*()";
      await notepad.connect(user1).addNote(specialNote);
      expect(await notepad.connect(user1).getSharedNote(1)).to.equal(specialNote);
    });

    it("Should revert when accessing a deleted note", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note to be deleted");
      await notepad.connect(user1).deleteNote(1);
      await expect(notepad.connect(user1).getSharedNote(1)).to.be.revertedWith("Note has been deleted");
    });

    it("Should revert if trying to delete a note twice", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note to delete twice");
      await notepad.connect(user1).deleteNote(1);
      await expect(notepad.connect(user1).deleteNote(1)).to.be.revertedWith("Note has been deleted");
    });

    it("Should revert when sharing settings are updated on a deleted note", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note to delete and update");
      await notepad.connect(user1).deleteNote(1);
      await expect(notepad.connect(user1).updateSharingSettings(1, true, [user2.address])).to.be.revertedWith(
        "Note has been deleted"
      );
    });

    it("Should allow a new user to add a note while there are existing notes from other users", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("User1's first note");
      await notepad.connect(user2).addNote("User2's first note");
      const user1Notes = await notepad.connect(user1).getUserNoteAmount();
      const user2Notes = await notepad.connect(user2).getUserNoteAmount();
      expect(user1Notes.length).to.equal(1);
      expect(user2Notes.length).to.equal(1);
    });

    it("Should restrict access to a note after it is made private", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note to be made private");
      await notepad.connect(user1).updateSharingSettings(1, true, []);
      await notepad.connect(user1).updateSharingSettings(1, false, []);
      await expect(notepad.connect(user2).getSharedNote(1)).to.be.revertedWith(
        "You do not have access to this note"
      );
    });

    it("Should handle multiple updates to the same note correctly", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note to be updated");
      await notepad.connect(user1).updateSharingSettings(1, true, []);
      await notepad.connect(user1).updateSharingSettings(1, false, []);
      await notepad.connect(user1).addNote("Another note");
      const userNotes = await notepad.connect(user1).getUserNoteAmount();
      expect(userNotes.length).to.equal(2);
    });

    it("Should maintain correct behavior with non-sequential note IDs", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("First note");
      await notepad.connect(user1).addNote("Second note");
      await notepad.connect(user1).deleteNote(1);
      await notepad.connect(user1).addNote("Third note");
      expect(await notepad.connect(user1).getSharedNote(2)).to.equal("Second note");
      expect(await notepad.connect(user1).getSharedNote(3)).to.equal("Third note");
    });

    it("Should revert if user tries to retrieve a note when none exists", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await expect(notepad.connect(user1).getSharedNote(1)).to.be.revertedWith("Note does not exist");
    });

    it("Should allow adding a note with maximum character limit", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      const longNote = "A".repeat(1024); // Assuming 1024 is the max length for a note.
      await notepad.connect(user1).addNote(longNote);
      expect(await notepad.connect(user1).getSharedNote(1)).to.equal(longNote);
    });

    it("Should allow sharing a note with multiple users and restrict access for others", async function () {
      const { notepad, user1, user2, user3 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Shared with multiple");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address, user3.address]);

      expect(await notepad.connect(user2).getSharedNote(1)).to.equal("Shared with multiple");
      expect(await notepad.connect(user3).getSharedNote(1)).to.equal("Shared with multiple");
    });

    it("Should allow public access when note is shared publicly and with specific users", async function () {
      const { notepad, user1, user2, user3 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Publicly and selectively shared");
      await notepad.connect(user1).updateSharingSettings(1, true, [user2.address]);

      const publicNote = await notepad.connect(user3).getSharedNote(1);
      expect(publicNote).to.equal("Publicly and selectively shared");

      const selectivelySharedNote = await notepad.connect(user2).getSharedNote(1);
      expect(selectivelySharedNote).to.equal("Publicly and selectively shared");
    });
  });

  describe("Sharing Settings", function () {
    it("Should allow the creator to update sharing settings", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Shared note");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address]);
      const sharedNoteContent = await notepad.connect(user2).getSharedNote(1);
      expect(sharedNoteContent).to.equal("Shared note");
    });

    it("Should emit NoteSharingUpdated event on sharing update", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note with sharing event");
      await expect(notepad.connect(user1).updateSharingSettings(1, true, [user2.address]))
        .to.emit(notepad, "NoteSharingUpdated")
        .withArgs(1, true, [user2.address]);
    });

    it("Should not allow non-creators to update sharing settings", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();

      await notepad.connect(user1).addNote("Private note");

      await expect(notepad.connect(user2).updateSharingSettings(1, true, [user2.address]))
        .to.be.revertedWith("Only the creator or contract owner can update sharing settings");


    });
    
    it("Only creator or contract owner should be allowed to change settings", async function () {
      const { notepad, owner, user1, user2 } = await deployNotepadFixture();

      await notepad.connect(user1).addNote("New note");

      await expect(notepad.connect(owner).updateSharingSettings(1, true, [user2.address]))
        .to.emit(notepad, "NoteSharingUpdated")
        .withArgs(1, true, [user2.address]);

      await expect(notepad.connect(user1).updateSharingSettings(1, true, [user2.address]))
        .to.emit(notepad, "NoteSharingUpdated")
        .withArgs(1, true, [user2.address]);
    });

    it("Should allow the creator to remove shared addresses", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note with sharing");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address]);
      await notepad.connect(user1).removeSharedAddress(1, user2.address);
      await expect(notepad.connect(user2).getSharedNote(1)).to.be.revertedWith(
        "You do not have access to this note"
      );
    });

    it("Should emit NoteSharingRemoved event when a shared address is removed", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note with removable sharing");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address]);
      await expect(notepad.connect(user1).removeSharedAddress(1, user2.address))
        .to.emit(notepad, "NoteSharingRemoved")
        .withArgs(1, user2.address);
    });

    it("Should revert if trying to remove an address not shared with the note", async function () {
      const { notepad, user1, user3 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Private note");
      await expect(notepad.connect(user1).removeSharedAddress(1, user3.address)).to.be.revertedWith(
        "Address is not shared with this note"
      );
    });

    it("Should revert if non-creator tries to remove a shared address", async function () {
      const { notepad, user1, user2, user3 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Shared note");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address]);
      await expect(notepad.connect(user2).removeSharedAddress(1, user3.address)).to.be.revertedWith(
        "Only the creator can remove sharing addresses"
      );
    });

    it("Should handle updating sharing settings with an empty address list", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note with no shared addresses initially");
      await notepad.connect(user1).updateSharingSettings(1, false, []);
      const userNotes = await notepad.connect(user1).getUserNoteAmount();
      expect(userNotes.length).to.equal(1);
    });

    it("Should handle updating sharing settings with duplicate addresses", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note with duplicate addresses in sharing");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address, user2.address]);
      const sharedNoteContent = await notepad.connect(user2).getSharedNote(1);
      expect(sharedNoteContent).to.equal("Note with duplicate addresses in sharing");
    });

    it("Should handle sharing with a mix of valid and invalid addresses", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note with mixed address sharing");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address, "0x0000000000000000000000000000000000000000"]);
      const sharedNoteContent = await notepad.connect(user2).getSharedNote(1);
      expect(sharedNoteContent).to.equal("Note with mixed address sharing");
    });

    it("Should revert when trying to share a deleted note", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note to be deleted and shared");
      await notepad.connect(user1).deleteNote(1);
      await expect(notepad.connect(user1).updateSharingSettings(1, false, [user2.address])).to.be.revertedWith(
        "Note has been deleted"
      );
    });

    it("Should handle toggling a note from public to private correctly", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Toggle visibility note");
      await notepad.connect(user1).updateSharingSettings(1, true, []);
      const publicNoteContent = await notepad.connect(user2).getSharedNote(1);
      expect(publicNoteContent).to.equal("Toggle visibility note");
      await notepad.connect(user1).updateSharingSettings(1, false, []);
      await expect(notepad.connect(user2).getSharedNote(1)).to.be.revertedWith(
        "You do not have access to this note"
      );
    });

    it("Should handle sharing and revoking access from multiple users", async function () {
      const { notepad, user1, user2, user3 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Note to share and revoke");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address, user3.address]);

      expect(await notepad.connect(user2).getSharedNote(1)).to.equal("Note to share and revoke");

      await notepad.connect(user1).removeSharedAddress(1, user3.address);
      await expect(notepad.connect(user3).getSharedNote(1)).to.be.revertedWith("You do not have access to this note");
    });

    it("Should revert if trying to update sharing settings for a non-existent note", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await expect(notepad.connect(user1).updateSharingSettings(999, false, [user2.address])).to.be.revertedWith(
        "Note does not exist"
      );
    });
  });

  describe("Access Controls", function () {
    it("Should restrict access to note if not shared or public", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Confidential note");
      await expect(notepad.connect(user2).getSharedNote(1)).to.be.revertedWith(
        "You do not have access to this note"
      );
    });

    it("Should allow access if note is public", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Public note");
      await notepad.connect(user1).updateSharingSettings(1, true, []);
      const publicNoteContent = await notepad.connect(user2).getSharedNote(1);
      expect(publicNoteContent).to.equal("Public note");
    });

    it("Should still allow access if note remains public after removing specific sharing", async function () {
      const { notepad, user1, user2, user3 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Public note to test removing specific sharing");
      await notepad.connect(user1).updateSharingSettings(1, true, [user2.address]);
      await notepad.connect(user1).removeSharedAddress(1, user2.address);
      const publicNoteContent = await notepad.connect(user3).getSharedNote(1);
      expect(publicNoteContent).to.equal("Public note to test removing specific sharing");
    });

    it("Should revert access if a public note is deleted", async function () {
      const { notepad, user1, user2 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Public note to be deleted");
      await notepad.connect(user1).updateSharingSettings(1, true, []);
      await notepad.connect(user1).deleteNote(1);
      await expect(notepad.connect(user2).getSharedNote(1)).to.be.revertedWith("Note has been deleted");
    });

    it("Should allow access to a selectively shared note", async function () {
      const { notepad, user1, user2, user3 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Selectively shared note");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address]);
      const sharedNoteContent = await notepad.connect(user2).getSharedNote(1);
      expect(sharedNoteContent).to.equal("Selectively shared note");
      await expect(notepad.connect(user3).getSharedNote(1)).to.be.revertedWith(
        "You do not have access to this note"
      );
    });

    it("Should restrict access for users removed from selectively shared notes", async function () {
      const { notepad, user1, user2, user3 } = await deployNotepadFixture();
      await notepad.connect(user1).addNote("Selectively shared note with removal");
      await notepad.connect(user1).updateSharingSettings(1, false, [user2.address, user3.address]);
      await notepad.connect(user1).removeSharedAddress(1, user2.address);
      await expect(notepad.connect(user2).getSharedNote(1)).to.be.revertedWith("You do not have access to this note");
    });
  });

  describe("Fallback Functionality", function () {
    it("Should revert when a non-existent function is called", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await expect(
        user1.sendTransaction({
          to: notepad,
          data: "0x12345678"
        })
      ).to.be.revertedWith("Fallback function: Call a function that exists!");
    });

    it("Should revert when an invalid function signature is used", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await expect(
        user1.sendTransaction({
          to: notepad,
          data: "0xabcdef12"
        })
      ).to.be.revertedWith("Fallback function: Call a function that exists!");
    });

    it("Should revert on valid but unexpected input data to fallback", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await expect(
        user1.sendTransaction({
          to: notepad,
          data: "0xffffffff"
        })
      ).to.be.revertedWith("Fallback function: Call a function that exists!");
    });

    it("Should revert on an invalid call to a non-existent fallback function", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await expect(
        user1.sendTransaction({
          to: notepad,
          data: "0x00000000"
        })
      ).to.be.revertedWith("Fallback function: Call a function that exists!");
    });

    it("Should handle valid but unintended fallback data and revert accordingly", async function () {
      const { notepad, user1 } = await deployNotepadFixture();
      await expect(
        user1.sendTransaction({
          to: notepad,
          data: "0xabcd1234"
        })
      ).to.be.revertedWith("Fallback function: Call a function that exists!");
    });
  });
});
