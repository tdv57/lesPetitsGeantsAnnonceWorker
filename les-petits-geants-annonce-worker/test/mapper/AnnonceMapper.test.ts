import { describe, it, expect } from "vitest"
import { fromD1AnnonceToAnnonceSelect } from "../../src/mapper/AnnonceMapper"
import { TypeMediaEnumValue } from "../../src/enums/TypeMediaEnum"
import { makeAnnonceSelect, makeD1Annonce } from "../Factory";

describe("fromD1AnnonceToAnnonceSelect", () => {
    it("recopie les champs simples", () => {
        const row = makeD1Annonce();
        const expected = makeAnnonceSelect();

        const result = fromD1AnnonceToAnnonceSelect(row);
        
        expect(result).toEqual(expected);
    });

    it("convertit les noms de colonnes snake_case en camelCase", () => {
        const row = makeD1Annonce({ media_type: TypeMediaEnumValue.VIDEO });
        const expected = makeAnnonceSelect({ mediaType: TypeMediaEnumValue.VIDEO });
        
        const result = fromD1AnnonceToAnnonceSelect(row);

        expect(result).toEqual(expected);
    });

    it("garde le lien de redirection quand il existe", () => {
        const row = makeD1Annonce({ redirection_link: "https://example.com/go.png" });
        const expected = makeAnnonceSelect({ redirectionLink: "https://example.com/go.png" });

        const result = fromD1AnnonceToAnnonceSelect(row);

        expect(result).toEqual(expected);
    });

    it("Transforme un redirection_link null en undefined", () => {
        const row = makeD1Annonce({ redirection_link: null });
        const expected = makeAnnonceSelect({ redirectionLink: undefined });

        const result = fromD1AnnonceToAnnonceSelect(row);

        expect(result).toEqual(expected);
    });

    it("Transforme une date string en objet Date", () => {
        const row = makeD1Annonce();

        const result = fromD1AnnonceToAnnonceSelect(row);

        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.createdAt.toISOString()).toBe(row.created_at);
    });
});