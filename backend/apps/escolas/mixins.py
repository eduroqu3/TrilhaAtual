from apps.accounts.models import RoleChoices


class EscolaIsolationMixin:
    """
    Mixin para views e viewsets que garante o isolamento estrito de dados por escola.
    Se o usuário for ADMIN sem escola definida, pode ver tudo (ou filtrar se especificado).
    Para ALUNO, PROFESSOR e COORDENACAO, o queryset é rigorosamente restrito à sua escola.
    """

    escola_lookup_field = "escola"

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, "user", None)

        if not user or not user.is_authenticated:
            return queryset.none()

        if user.role == RoleChoices.ADMIN and not user.escola:
            return queryset

        escola = user.escola
        if not escola:
            return queryset.none()

        lookup = self.get_escola_lookup()
        return queryset.filter(**{lookup: escola})

    def get_escola_lookup(self):
        """
        Retorna o caminho do lookup para filtrar por escola no modelo da view.
        Pode ser sobrescrito se o campo for, por exemplo, 'turma__escola'.
        """
        if hasattr(self, "escola_lookup"):
            return self.escola_lookup

        model = getattr(self, "queryset", None)
        if model is not None:
            model = model.model
        elif hasattr(self, "get_serializer_class") and hasattr(self.get_serializer_class(), "Meta"):
            model = getattr(self.get_serializer_class().Meta, "model", None)

        if model:
            field_names = [f.name for f in model._meta.get_fields()]
            if "escola" in field_names:
                return "escola"
            if "turma" in field_names:
                return "turma__escola"

        return self.escola_lookup_field
